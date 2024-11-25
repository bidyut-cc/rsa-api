/**
 * @description Module to generate PDF
 * @author CodeClouds
 */
const pdfMake = require('pdfmake/build/pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');

  // Register custom fonts (optional, but may be needed depending on your content)
   pdfMake.vfs = vfsFonts.pdfMake.vfs;

   /**
   * Create a PDF document definition
   *
   * @param {object} htmlObj
   * @return {string} 
   */
  const  generateQuotePDF = async (htmlObj) => {
    try {
      const docDefinition = htmlObj;
      const pdfBuffer = await generatePDFBuffer(docDefinition);
      return pdfBuffer;
      } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error(error);
      }
  }

  
  /**
   * Generate PDF buffer
   *
   * @param {string} docDefinition
   * @return {buffer} 
   */
  const generatePDFBuffer = async (docDefinition) =>{
    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBuffer((buffer) => {
          resolve(buffer);
        });
      } catch (error) {
        reject(error);
      }
    });
  }


   
  

  module.exports = {
    generateQuotePDF
}
