const Order = require("../Models/Order.js");
const Quotation = require("../Models/Quotation.js");
const Controller = require("./Controller.js");
const moment = require('moment');
const _ = require("lodash");
const abandonedOrder = require("../Models/AbandonedOrder.js");

class OrdersController extends Controller {
    constructor() {
        super("Order");
        // this.monthtyOrder = this.monthtyOrder.bind(this);
        // this.fillMissingMonths = this.fillMissingMonths.bind(this);
    }

    async getListQuery(req) {
      var trash = req.query.trash || false;
      var limit = req.query.show || 10;
      var page = req.query.page || 1;
      var offset = (parseInt(page) - 1) * parseInt(limit);
      var search = req.query.search || "";
      var sort_field = req.query.sort || "_id";
      var sort_order = req.query.sort_order || "desc";
      var where_clause = req.query.where_clause
          ? JSON.parse(req.query.where_clause)
          : {
                where_fields: [],
                where_values: [],
            };
      sort_order = sort_order == "asc" ? 1 : -1;
      var fields = this.getModelObj().schema.customFields;
      let select_fields = Object.keys(fields);
      let search_fields = select_fields.filter((item) => {
          if (fields[item]["searchable"]) return item;
      });
      var sort_order_obj = { [sort_field]: sort_order };
      let search_query = {};
      if (search.length > 0) {
          var search_arr = [];
          for (var field of search_fields) {
              search_arr.push({
                  [field]: {
                      $regex: search,
                      $options: "i",
                  },
              });
          }
          search_query = { $or: search_arr };
      }

      let find_query = {};
      for (
          var field_key = 0;
          field_key < where_clause.where_fields.length;
          field_key++
      ) {
          find_query[where_clause.where_fields[field_key]] =
              where_clause.where_values[field_key];
      }
      // Add condition for order_id not null and not blank
    find_query["order_id"] = { $nin: [null, ""] };
      if (!_.isEmpty(find_query)) {
          if (!_.isEmpty(search_query)) {
              var new_search_query = {
                  $and: [find_query, search_query],
              };
          } else {
              var new_search_query = {
                  $and: [find_query],
              };
          }

          search_query = new_search_query;
      }
      return {
          search: search_query,
          select: select_fields.join(" "),
          limit: parseInt(limit),
          skip: parseInt(offset),
          sort: sort_order_obj,
          current_page: page,
          per_page: limit,
          trash: trash,
      };
  } 
  
/**
 * Fetches and returns various charts data for orders and leads.
 *
 * @async
 * @function charts
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - An object containing data for monthly orders, monthly leads, order ratios, and recent orders.
 * 
 * @throws {Error} - If there is an issue fetching the required data from the database or other services.
 * 
 * @description
 * This method fetches:
 * - Monthly orders data
 * - Monthly leads data
 * - Total orders count
 * - Total completed orders count
 * - Recent orders
 * 
 * The method aggregates these results into a response object and returns them.
 */
async charts(req,res){
     try {
      const monthlyOrders = await this.monthtyOrder();
      const monthlyLeads = await this.monthlyLead();
      const totalOrders = await Quotation.countDocuments();
      const totalCompleteOrders = await Quotation.countDocuments({ is_converted_to_deal: true });
      const recentOrders = await super.list(req);
      // res.status(200).json({
      //   status:true,
      //   data:monthlyOrders
      // }); 
      return {
          status:true,
          data:{
            monthlyOrders:monthlyOrders,
            monthlyLeads:monthlyLeads,
            orderRatio:{
              totalOrders:totalOrders,
              totalCompleteOrders:totalCompleteOrders
            },
            recentOrders:recentOrders.results.results.data
          }
      }
     } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Failed to fetch order totals' });
     }
      
    }

/**
 * Fetches the total order amount for the past 6 months, grouped by month.
 *
 * @async
 * @function monthtyOrder
 * @returns {Object} - An array of objects containing the year, month, and total amount for each month.
 * 
 * @throws {Error} - If there is an issue fetching or processing the data from the database.
 * 
 * @description
 * This method:
 * - Filters the orders to include only those from the past 6 months.
 * - Groups the data by year and month, and sums the `amount` for each group.
 * - Returns an array of objects, each containing the year, month, and the total order amount for that month.
 * 
 * The result is formatted to ensure that data for every month in the last 6 months is included, even if there are no orders for some months.
 */

    async monthtyOrder(){
        try {
            const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
            const now = moment().endOf('month').toDate();
        
            const result = await Order.aggregate([
              {
                $match: {
                  paymentDate: { $gte: sixMonthsAgo, $lte: now }, // Filter by last 6 months
                  deleted: false, // Add this if you want to exclude deleted records
                  payment_status:"Captured"
                }
              },
              {
                $addFields: {
                  amount: { $toDouble: '$amount' } // Convert amount to a number
                }
              },
              {
                $group: {
                  _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, // Group by year and month
                  totalAmount: { $sum: '$amount' } // Sum the `amount` field
                }
              },
              {
                $sort: { '_id.year': 1, '_id.month': 1 } // Sort by year and month
              }
            ]);
        
            // Format the result for easier usage
            const formattedResult = await this.fillMissingMonths(result, 6, 'totalAmount');
            return formattedResult
            //res.status(200).json(formattedResult);
          } catch (error) {
            console.error('Error fetching order totals:', error);
            return {
              status:false,
              message:'Failed to fetch order totals'
            }
          }
    }

/**
 * Fetches the number of leads (quotations) created in the past 6 months, grouped by month.
 *
 * @async
 * @function monthlyLead
 * @returns {Object} - An array of objects containing the year, month, and the count of leads for each month.
 * 
 * @throws {Error} - If there is an issue fetching or processing the data from the database.
 * 
 * @description
 * This method:
 * - Filters the quotations to include only those created in the past 6 months.
 * - Groups the data by year and month, and counts the number of leads (quotations) for each group.
 * - Returns an array of objects, each containing the year, month, and the total count of leads for that month.
 * 
 * The result is formatted to ensure that data for every month in the last 6 months is included, even if there are no leads for some months.
 */

    async monthlyLead() {
      try {
          const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
          const now = moment().endOf('month').toDate();
  
          // Aggregate data
          const result = await Quotation.aggregate([
              {
                  $match: {
                      createdAt: { $gte: sixMonthsAgo, $lte: now }, // Filter by last 6 months
                      deleted: false, // Exclude deleted records
                  },
              },
              {
                  $group: {
                      _id: {
                          year: { $year: '$createdAt' },
                          month: { $month: '$createdAt' },
                      },
                      count: { $sum: 1 }, // Count the number of records
                  },
              },
              {
                  $sort: { '_id.year': 1, '_id.month': 1 }, // Sort by year and month
              },
          ]);
  
          // Fill in missing months
          const formattedResult = await this.fillMissingMonths(result, 6, 'count');
  
          return formattedResult;
      } catch (error) {
          console.error('Error fetching monthly data:', error);
          return {
              status: false,
              message: 'Failed to fetch monthly data',
          };
      }
  }

/**
 * Fills in missing months for a given time range and returns an array of objects with year, month, and a specific value.
 *
 * @async
 * @function fillMissingMonths
 * @param {Array} data - The aggregated data to be filled with missing months.
 * @param {number} monthsCount - The total number of months to consider, starting from the current month and going backwards.
 * @param {string} key - The key in the data objects that contains the value to be returned (e.g., 'totalAmount', 'count').
 * @returns {Array} - An array of objects, each containing the year, month, and the value for the specified key.
 * 
 * @description
 * This method:
 * - Iterates over the specified number of months (from the current month back to `monthsCount` months ago).
 * - Checks if there is an entry for each month in the provided data.
 * - If an entry exists for the month, it adds the value from the data, otherwise it assigns a default value of `0`.
 * 
 * The result ensures that all months within the range are included in the returned array, even if no data is available for some months.
 */

    async fillMissingMonths(data, monthsCount, key) {
        const result = [];
        const now = moment();
      
        for (let i = monthsCount - 1; i >= 0; i--) {
          const date = moment().subtract(i, 'months');
          const year = date.year();
          const month = date.month() + 1; // Months are 0-indexed
      
          const existingEntry = data.find(
            (item) => item._id.year === year && item._id.month === month
          );
      
          result.push({
            year,
            month,
            [key]: existingEntry ? existingEntry[key] : 0
          });
        }
      
        return result;
      }

      // async abandonedOrders() {
      //   const data = await abandonedOrder.aggregate([
      //     {
      //       $sort: { createdAt: -1 }
      //     },
      //     {
      //       $group: {
      //         _id: "$cart_id",
      //         doc: { $first: "$$ROOT" }
      //       }
      //     },
      //     {
      //       $replaceRoot: {
      //         newRoot: "$doc"
      //       }
      //     },
      //     {
      //       $lookup: {
      //         from: "orders",
      //         let: { cartId: "$cart_id" },
      //         pipeline: [
      //           {
      //             $match: {
      //               $expr: {
      //                 $and: [
      //                   { $eq: ["$cart_id", "$$cartId"] },
      //                   { $eq: ["$order_status", "Pending"] } ,
      //                   { $eq: ["$payment_status", "Pending"] } 
      //                 ]
      //               }
      //             }
      //           }
      //         ],
      //         as: "orders_data"
      //       }
      //     },
      //     {
      //       $match: {
      //         orders_data: { $ne: [] } // Only include documents where the lookup found matches
      //       }
      //     }
      //   ]);
      //   return data;
      // }

      async abandonedOrders(req) {
        const search = req.query.search || "";
        const limit = parseInt(req.query.show || 10);
        const page = parseInt(req.query.page || 1);
        const offset = (page - 1) * limit;
        const sort_field = req.query.sort || "createdAt";
        const sort_order = req.query.sort_order === "asc" ? 1 : -1;
      
        // Custom fields and search field setup
        const fields = this.getModelObj().schema.customFields;
        const select_fields = Object.keys(fields);
        const search_fields = select_fields.filter((item) => fields[item]["searchable"]);
      
        // Aggregation stages
        const baseStages = [
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$cart_id",
              doc: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$doc" } },
          {
            $lookup: {
              from: "orders",
              let: { cartId: "$cart_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$cart_id", "$$cartId"] },
                        { $eq: ["$order_status", "Pending"] },
                        { $eq: ["$payment_status", "Pending"] },
                      ],
                    },
                  },
                },
              ],
              as: "orders_data",
            },
          },
          { $match: { orders_data: { $ne: [] } } },
        ];
      
        // Dynamic search condition
        if (search.length > 0 && search_fields.length > 0) {
          const dynamicSearch = search_fields.map((field) => ({
            [`orders_data.${field}`]: { $regex: search, $options: "i" },
          }));
      
          baseStages.push({
            $match: {
              $or: dynamicSearch,
            },
          });
        }
      
        // Count query
        const totalResult = await abandonedOrder.aggregate([
          ...baseStages,
          { $count: "total" },
        ]);
        const count = totalResult.length > 0 ? totalResult[0].total : 0;
      
        // Last page calculation
        let last_page = 1;
        if (parseInt(count) / limit > 1) {
          last_page = parseInt(parseInt(count) / limit);
          if (parseInt(count) % limit > 0) {
            last_page++;
          }
        }
      
        // Fetch paginated data
        const data = await abandonedOrder.aggregate([
          ...baseStages,
          { $sort: { [sort_field]: sort_order } },
          { $skip: offset },
          { $limit: limit },
        ]);
      
        return {
          fields: fields,
          results: {
            results_count: count,
            results: {
              query: {
                search,
                show: limit,
                page,
                sort: sort_field,
                sort_order,
              },
              data: data,
              count: count,
              current_page: page,
              per_page: limit,
              last_page: last_page,
              to: count,
              total: count,
            },
          },
        };
      }
      
      
      
      
      
      
}

module.exports = OrdersController;
