/**
 * Installs the CloudCRM TSplus Agent as a Windows Service.
 * Run as Administrator: node install-service.js
 */
const Service = require("node-windows").Service;
const path = require("path");

const svc = new Service({
  name: "CloudCRM TSplus Agent",
  description: "CloudCRM TSplus provisioning agent for Windows Server",
  script: path.join(__dirname, "server.js"),
  env: [
    { name: "NODE_ENV", value: "production" },
  ],
});

svc.on("install", () => {
  svc.start();
  console.log("✅ Service installed and started!");
  console.log("   Manage via: services.msc → CloudCRM TSplus Agent");
});

svc.on("alreadyinstalled", () => console.log("⚠️  Already installed"));
svc.on("error", (e) => console.error("❌ Error:", e));

svc.install();
