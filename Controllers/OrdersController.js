const Order = require("../Models/Order.js");
const Quotation = require("../Models/Quotation.js");
const Controller = require("./Controller.js");
const moment = require('moment');


class OrdersController extends Controller {
    constructor() {
        super("Order");
        // this.monthtyOrder = this.monthtyOrder.bind(this);
        // this.fillMissingMonths = this.fillMissingMonths.bind(this);
    }
  
    async charts(req,res){
     try {
      const monthlyOrders = await this.monthtyOrder();
      const totalOrders = await Quotation.countDocuments();
      const totalCompleteOrders = await Quotation.countDocuments({ is_converted_to_deal: true });
      // res.status(200).json({
      //   status:true,
      //   data:monthlyOrders
      // });
      return {
          status:true,
          data:{
            monthlyOrders:monthlyOrders,
            orderRatio:{
              totalOrders:totalOrders,
              totalCompleteOrders:totalCompleteOrders
            }
          }
      }
     } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order totals' });
     }
      
    }
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
            const formattedResult = await this.fillMissingMonths(result, 6);
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

    async fillMissingMonths(data, monthsCount) {
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
            totalAmount: existingEntry ? existingEntry.totalAmount : 0
          });
        }
      
        return result;
      }
}

module.exports = OrdersController;
