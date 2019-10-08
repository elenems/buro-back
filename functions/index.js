const functions = require("firebase-functions");
const cors = require("cors");
const app = require("express")();
app.use(cors());

const {
  addItem,
  getItem,
  getItems,
  getItemsFromSearch,
  sendMessage
} = require("./routes/items");

//Clothes
app.post("/addItem", addItem);
app.get("/getItems", getItems);
app.post("/getItemsFromSearch", getItemsFromSearch);
app.get("/getItem", getItem);
app.post("/sendMessage", sendMessage);

exports.api = functions.region("europe-west2").https.onRequest(app);