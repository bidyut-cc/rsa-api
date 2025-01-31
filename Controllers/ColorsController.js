
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

  async update(req) {
    const materialId = req.body.material_id;

    // Convert colors into an array of objects
    const colors = Object.keys(req.body)
      .filter((key) => key.startsWith("colors["))
      .reduce((acc, key) => {
        const match = key.match(/colors\[(\d+)]\[(\w+)]/);
        if (match) {
          const index = match[1];
          const field = match[2];
          acc[index] = acc[index] || {};
          acc[index][field] = req.body[key];
        }
        return acc;
      }, []);
      // Convert textures into an array of objects
      let textures = Object.keys(req.body)
      .filter((key) => key.startsWith("textures["))
      .reduce((acc, key) => {
        const match = key.match(/textures\[(\d+)](?:\[images]\[(\d+)]\[(\w+)])?/);
        if (match) {
          const textureIndex = match[1];
          const imageIndex = match[2];
          const field = match[3];

          acc[textureIndex] = acc[textureIndex] || { name: "", images: [] };

          if (!imageIndex) {
            acc[textureIndex].name = req.body[key];
          } else {
            acc[textureIndex].images[imageIndex] =
              acc[textureIndex].images[imageIndex] || {};

            if (field) {
              acc[textureIndex].images[imageIndex][field] = req.body[key];
            }
          }
        }
        return acc;
      }, []);

    // Process binary images in textures
    textures = await Promise.all(
      textures.map(async (texture, index) => {
        if (!texture.images) texture.images = [];

        for (let i = 0; i < texture.images.length; i++) {
          console.log(texture);
          const imgKey = `textures[${index}][images][${i}]`;
        //  console.log(imgKey)
          const img = req.files?.[imgKey];
         // console.log(req.files);
          if (img) {
            // Upload the binary image
            const uploadedFile = await file_uploader.upload(
              { image: img },
              "textures"
            );

            // Replace the empty object with uploaded file details
            texture.images[i] = {
              filename: uploadedFile.filename,
              mimetype: uploadedFile.mimetype,
            };
          }
        }

        return texture;
      })
    );
      const result = {
        material_id: materialId,
        colors: colors.filter(Boolean),
        textures: textures.filter(Boolean),
      };
      // let obj = await eval("Models." + this.model_name).findById(req.params.id);
      // if (!obj) {
      //     return { status: false, message: "Record not found!" };
      // }
      // obj.colors = result.colors;
  
      return { success: true, data: result };

}







  
  
      
    

}

module.exports = ColorsController;
