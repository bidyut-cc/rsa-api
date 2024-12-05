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
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement", "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
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
            all: [ "list","view"],
            group: [ "list","view"],
            owner: [ "list","view"],
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
            all: [ "view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
            group: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
            owner: ["view", "updateProject", "updateLayout", "updateMeasurement",  "updateColor", "updateQuotationBuilder","updateQuotationBuilderADAprice"],
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
            all: [ "list","view"],
            group: [ "list","view"],
            owner: [ "list","view"],
        },
    },
    user: {
        
    }
};
