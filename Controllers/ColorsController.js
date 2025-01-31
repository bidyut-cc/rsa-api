
const Controller = require("./Controller.js");
const Models = require("../Models");
const AccountLog = require("../Helpers/AccountLog.js");
const file_uploader = require("../Helpers/Uploader");
const _ = require("lodash");

class ColorsController extends Controller {
    constructor() {
        super("Color");
    }
    async view(req) {
        var obj = this.getModelObj();
        let fields = obj.schema.customFields;
    
        obj = await eval(
            `Models.${this.model_name}.findOne({ material_id: '${req.params.id}' })`
        );
    
        return {
            fields: fields,
            results: {
                result: obj,
            },
        };
    }


  //   async update(req) {
  //     let obj = await eval("Models." + this.model_name).findById(req.params.id);
  
  //     if (!obj) {
  //         return { status: false, message: "Record not found!" };
  //     }
  
  //     // Handle colors
  //     if (req.body.colors) {
  //         let colors = [];
  //         Object.keys(req.body).forEach((key) => {
  //             const match = key.match(/^colors\[(\d+)]\[(color|name)]$/);
  //             if (match) {
  //                 let index = match[1];
  //                 let type = match[2];
  
  //                 if (!colors[index]) {
  //                     colors[index] = {};
  //                 }
  //                 colors[index][type] = req.body[key];
  //             }
  //         });
  //         obj.colors = colors;
  //     }
  
  //     // Handle textures and image uploads
  //     if (!_.isEmpty(req.files)) {
  //         let textureFiles = Object.keys(req.files).filter((key) =>
  //             key.startsWith("textures")
  //         );
  //         let textures = {};
  //         textureFiles.forEach((key) => {
  //             const match = key.match(/textures\[(\d+)]\[images]\[(\d+)]/);
  //             if (match) {
  //               console.log(match);
  //                 let textureIndex = match[1]; // Extract texture index
  //                 let imageIndex = match[2];
  
  //                 if (!textures[textureIndex]) {
  //                     textures[textureIndex] = {
  //                         name: req.body[`textures[${textureIndex}][name]`] || `Texture ${textureIndex}`,
  //                         images: [],
  //                     };
  //                 }
  
  //                 textures[textureIndex].images[imageIndex] = req.files[key];
  //             }
  //         });
  
  //         let texturesArray = Object.values(textures);
  //         // Upload images
  //         for (let texture of texturesArray) {
  //        //   console.log(texture);
  //             let uploadedImages = [];
  //             for (let img of texture.images) {
  //                 let uploadResponse = await file_uploader.upload({ image: img }, "textures");
  
  //                 if (uploadResponse.status) {
  //                     uploadedImages.push(uploadResponse.files.image);
  //                 } else {
  //                     return {
  //                         status: false,
  //                         message: `File upload failed for texture: ${texture.name}`,
  //                     };
  //                 }
  //             }
  
  //             texture.images = uploadedImages; // Replace raw images with uploaded paths
  //         }
  
  //         obj.textures = texturesArray; // Assign structured textures array
  //     } else {
  //         // If no textures field is provided, set textures to an empty array
  //         obj.textures = [];
  //     }
  
  //     // Handle other fields (e.g., material_id)
  //     for (var param in req.body) {
  //         if (obj.schema.fillable.indexOf(param) > -1) {
  //             obj[param] = req.body[param];
  //         }
  //     }
  
  //     try {
  //       //  await obj.save();
  //         return {
  //             status: true,
  //             message: "Updated Successfully.",
  //             object: obj,
  //         };
  //     } catch (error) {
  //         return {
  //             status: false,
  //             message: error.message,
  //         };
  //     }
  // }

  async update(req,res) {
    try {
      // console.log("Received Form Data:", req.body);
      // console.log("Received Files:", req.files);
            let obj = await eval("Models." + this.model_name).findById(req.params.id);
  
      if (!obj) {
          return { status: false, message: "Record not found!" };
      }
  
      if (!req.body["material_id"]) {
        return res.status(400).json({ message: "Material ID is required" });
      }
  
      // Reconstruct colors array
      let colors = [];
      Object.keys(req.body).forEach((key) => {
        const match = key.match(/^colors\[(\d+)\]\[(\w+)\]$/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
  
          if (!colors[index]) {
            colors[index] = {};
          }
          colors[index][field] = req.body[key];
        }
      });
      let textures = [];
      // Reconstruct textures array
      Object.keys(req.body).forEach((key) => {
        let matchName = key.match(/^textures\[(\d+)\]\[name\]$/);
        let matchImage = key.match(/^textures\[(\d+)\]\[images\]\[(\d+)\]\[(\w+)\]$/);
      
        if (matchName) {
          const index = parseInt(matchName[1], 10);
          
          if (!textures[index]) {
            textures[index] = { name: "", images: [] };
          }
      
          // ✅ Assign the texture name
          textures[index].name = req.body[key];
        }
      
        if (matchImage) {
          const textureIndex = parseInt(matchImage[1], 10);
          const imageIndex = parseInt(matchImage[2], 10);
          const field = matchImage[3];
      
          if (!textures[textureIndex]) {
            textures[textureIndex] = { name: "", images: [] };
          }
      
          if (!textures[textureIndex].images[imageIndex]) {
            textures[textureIndex].images[imageIndex] = {};
          }
      
          // ✅ Assign image filename & mimetype correctly
          textures[textureIndex].images[imageIndex][field] = req.body[key];
        }
      });
  
      // Process file uploads for textures
      if (req.files) {
        await Promise.all(
          Object.keys(req.files).map(async (key) => {
            const match = key.match(/^textures\[(\d+)\]\[images\]\[(\d+)\]$/);
            if (match) {
              const textureIndex = parseInt(match[1], 10);
              const imageIndex = parseInt(match[2], 10);
              const file = req.files[key];
      
              if (!textures[textureIndex]) {
                textures[textureIndex] = { name: "", images: [] };
              }
      
              // ✅ Upload file & get the uploaded image URL/path
              const uploaded_file = await file_uploader.upload({ image: file }, "textures");
              // ✅ Assign uploaded image details
              
              if (!uploaded_file.status) {
                res.status(200).json({
                    status: false,
                    message: uploaded_file.trace,
                });
            }
            textures[textureIndex].images[imageIndex] = uploaded_file.files.image;
            }
          })
        );
      }
  
      obj.material_id = req.body.material_id;
      obj.colors = colors;
      obj.textures = textures;
      await obj.save();
          return {
              status: true,
              message: "Updated Successfully.",
              object: obj,
          };
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({ message: "Server error" });
    }
}







  
  
      
    

}

module.exports = ColorsController;
