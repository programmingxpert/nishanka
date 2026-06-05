const { Schema, model, models } = require('mongoose');

const systemConfigSchema = new Schema({
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "The bot is currently undergoing maintenance. Please try again later." },
    maintenanceETA: { type: String, default: null },
    announcement: { type: String, default: "" },
    announcementActive: { type: Boolean, default: false },
    announcementUpdatedAt: { type: Date, default: Date.now }
});

module.exports = models.SystemConfig || model('SystemConfig', systemConfigSchema);
