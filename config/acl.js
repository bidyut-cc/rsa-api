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
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
        },
        masterSettings: {
            all: [ "view","materialView","updateMaterialDescription"],
            group: ["view","materialView","updateMaterialDescription"],
            owner: ["view","materialView","updateMaterialDescription"],
        },
        quotations: {
            all: [ "list","view","generateQuotationPDF"],
            group: [ "list","view","generateQuotationPDF"],
            owner: [ "list","view","generateQuotationPDF"],
        },
        orders: {
            all: [ "list","view","charts","abandonedOrders"],
            group: [ "list","view","charts","abandonedOrders"],
            owner: [ "list","view","charts","abandonedOrders"],
        },
        colors: {
            all: [ "list","view","update"],
            group: [ "list","view","update"],
            owner: [ "list","view","update"],
        },
        bids: {
            all: [ "list","view","export","update","processOpportunity"],
            group: [ "list","view","export","update","processOpportunity"],
            owner: [ "list","view","export","update","processOpportunity"],
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
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice","updateMaterialInstallationQuote","updateInstallationSetup"],
        },
        masterSettings: {
            all: [ "view","materialView","updateMaterialDescription"],
            group: ["view","materialView","updateMaterialDescription"],
            owner: ["view","materialView","updateMaterialDescription"],
        },
        quotations: {
            all: [ "list","view","generateQuotationPDF"],
            group: [ "list","view","generateQuotationPDF"],
            owner: [ "list","view","generateQuotationPDF"],
        },
        orders: {
            all: [ "list","view","charts","abandonedOrders"],
            group: [ "list","view","charts","abandonedOrders"],
            owner: [ "list","view","charts","abandonedOrders"],
        },
        colors: {
            all: [ "list","view","update"],
            group: [ "list","view","update"],
            owner: [ "list","view","update"],
        },
        bids: {
            all: [ "list","view","export","update","processOpportunity"],
            group: [ "list","view","export","update","processOpportunity"],
            owner: [ "list","view","export","update","processOpportunity"],
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
            all: [ "list","view","charts","abandonedOrders"],
            group: [ "list","view","charts","abandonedOrders"],
            owner: [ "list","view","charts","abandonedOrders"],
        },
        masterSettings: {
            all: ["materialView"],
            group: ["materialView"],
            owner: ["materialView"],
        },
    }
};
