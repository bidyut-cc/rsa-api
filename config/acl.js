/**
 * @description File to cache all the ACL configuration
 * @author CodeClouds
 */

module.exports = {
    developer: {
        users: {
            all: [
                "createView",
                "add",
                "save",
                "view",
                "edit",
                "update",
                "delete",
                "export",
                "list",
                "upload",
            ],
            group: [
                "createView",
                "add",
                "save",
                "view",
                "update",
                "delete",
                "export",
                "list",
            ],
            owner: [
                "createView",
                "add",
                "save",
                "view",
                "update",
                "delete",
                "export",
                "list",
            ],
        },
        changelogs: {
            all: ["createView", "add", "save", "view", "update","delete","export","list","report",],
            group: ["createView", "add", "save", "view", "update","delete","export","list","report",],
            owner: ["createView", "add", "save", "view", "update","delete","export","list","report",],
        },
        checkouts: {
            all: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
            group: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
            owner: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
        },
        settings: {
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
        },
        masterSettings: {
            all: [ "view","materialView"],
            group: ["view","materialView"],
            owner: ["view","materialView"],
        },
        quotations: {
            all: [ "list","view","generateQuotationPDF"],
            group: [ "list","view","generateQuotationPDF"],
            owner: [ "list","view","generateQuotationPDF"],
        },
        orders: {
            all: [ "list","view","charts"],
            group: [ "list","view","charts"],
            owner: [ "list","view","charts"],
        },
        colors: {
            all: [ "list","view","update"],
            group: [ "list","view","update"],
            owner: [ "list","view","update"],
        },
        
    },
    super_admin: {
        users: {
            all: [
                "createView",
                "add",
                "save",
                "view",
                "edit",
                "update",
                "delete",
                "export",
                "list",
                "upload",
            ],
            group: [
                "createView",
                "add",
                "save",
                "view",
                "update",
                "delete",
                "export",
                "list",
            ],
            owner: [
                "createView",
                "add",
                "save",
                "view",
                "update",
                "delete",
                "export",
                "list",
            ],
        },
        changelogs: {
            all: ["createView", "add", "save", "view", "update","delete","export","list","report",],
            group: ["createView", "add", "save", "view", "update","delete","export","list","report",],
            owner: ["createView", "add", "save", "view", "update","delete","export","list","report",],
        },
        checkouts: {
            all: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
            group: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
            owner: ["checkout", "add", "save", "view", "update","delete","export","list","report",],
        },
        settings: {
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote"],
        },
        masterSettings: {
            all: [ "view","materialView"],
            group: ["view","materialView"],
            owner: ["view","materialView"],
        },
        quotations: {
            all: [ "list","view","generateQuotationPDF"],
            group: [ "list","view","generateQuotationPDF"],
            owner: [ "list","view","generateQuotationPDF"],
        },
        orders: {
            all: [ "list","view","charts"],
            group: [ "list","view","charts"],
            owner: [ "list","view","charts"],
        },
        colors: {
            all: [ "list","view","update"],
            group: [ "list","view","update"],
            owner: [ "list","view","update"],
        },
    },
    sales_agent: {
        users: {
            all: [
                "list",
            ],
            group: [
                "list",
            ],
            owner: [
                "list",
            ],
        },
        quotations: {
            all: [ "list","view","generateQuotationPDF"],
            group: [ "list","view","generateQuotationPDF"],
            owner: [ "list","view","generateQuotationPDF"],
        },
        orders: {
            all: [ "list","view","charts"],
            group: [ "list","view","charts"],
            owner: [ "list","view","charts"],
        },
        masterSettings: {
            all: ["materialView"],
            group: ["materialView"],
            owner: ["materialView"],
        },
    }
};
