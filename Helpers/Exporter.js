/**
 * @description Module to export data to .xlsx file
 * @author CodeClouds
 */
var axios = require("axios");

const excel = require("node-excel-export");
const fs = require("fs");

class Exporter {
    constructor() {
        this.styles = {
            headerStyle: {
                fill: {
                    fgColor: {
                        rgb: "f28230",
                    },
                },
                font: {
                    color: {
                        rgb: "00315b",
                    },
                    sz: 14,
                    bold: true,
                },
            },
        };
        this.export = this.export.bind(this);
    }

    export(header, data) {
        for (var key in header) {
            header[key]["headerStyle"] = this.styles.headerStyle;
        }
        const report = excel.buildExport([
            {
                name: "Export",
                specification: header,
                data: data,
            },
        ]);
        return report;
    }
}

module.exports = Exporter;
