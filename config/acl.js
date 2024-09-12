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
        
    },
};
