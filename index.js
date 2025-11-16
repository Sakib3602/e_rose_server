const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const axios = require("axios");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGO_URL}:${process.env.MONGO_PASS}@rosewood.euiuyee.mongodb.net/?retryWrites=true&w=majority&appName=rosewood`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const AllData = client.db("rosewood").collection("AllData");
    const AllUser = client.db("rosewood").collection("AllUser");
    const AllOrder = client.db("rosewood").collection("AllOrder");
    const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${port}`).replace(/\/$/, "");

    // ssl start

    app.post("/initialpayment", async (req, res) => {
      

      const txid = new ObjectId().toString();
      const data = {
        store_id: process.env.SSL_ID,
        store_passwd: process.env.SSL_PASS,
        total_amount: req.body.totalTaka,
        currency: "BDT",
        tran_id: txid,
        product_category : "Clothes",
        emi_option : 0,
        
        success_url: `${BACKEND_URL}/payment/success`,
        fail_url: `${BACKEND_URL}/payment/fail`,
        cancel_url: `${BACKEND_URL}/payment/cancel`,

        cus_name: req.body.name,
        cus_email: req.body.email,
        cus_add1: req.body.district,
        cus_add2: req.body.division,
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: req.body.userNumber,
        cus_fax: "01711111111",

        shipping_method : "Home Delivery",
        ship_name: "All in one",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: "1000",
        ship_country: "Bangladesh",

        num_of_item: 1,
        weight_of_items :  2.00,
        product_name : "Clothes",
        product_profile : "general",
        multi_card_name: "mastercard,visacard,amexcard",

        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };

      const resp = await axios({
        method: "post",
        url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        data: new URLSearchParams(data).toString(),
        headers:{
          "Content-Type": "application/x-www-form-urlencoded",
        }
      })

      const up = await AllOrder.updateMany(
        { _id: new ObjectId(req.body.orderId) },
        { $set: { transactionId: txid, orderStatus: "Pending" } }
      );




      res.send({
        paymentUrl: resp.data.GatewayPageURL,
      })




    });

    app.post("/payment/success", async (req, res) => {
      try {
        

        // Try to find tran_id that the gateway posts back. Check body first, then query.
        const tranId = req.body?.tran_id || req.query?.tran_id || req.body?.tran_id;

        if (tranId) {
          const updateRes = await AllOrder.updateOne(
            { transactionId: tranId },
            { $set: { orderStatus: "Paid", paymentDetails: req.body, paidAt: new Date() } }
          );
          console.log("Updated order for tran_id", tranId, updateRes.modifiedCount);
        } else {
          console.log("No tran_id found in callback; cannot update order status.");
        }

        res.redirect( "https://rosewd.netlify.app/success");
      } catch (err) {
        console.error("Error in /payment/success:", err);
        res.status(500).send("error");
      }
    });

    app.post("/payment/fail", async (req, res) => {
      res.redirect( "https://rosewd.netlify.app/fail");
    });
    app.post("/payment/cancel", async (req, res) => {
      res.redirect( "https://rosewd.netlify.app/cancel");
    });

    //  ssl end
    app.post("/user", async (req, res) => {
      const body = req.body;
      console.log(body);
      if (await AllUser.findOne({ email: body?.email })) {
        return;
      }
      const result = await AllUser.insertOne(body);
      res.send(result);
    });
    app.get("/ordersAll", async (req, res) => {
      const result = await AllOrder.find().sort({ orderTime: -1 }).toArray();
      res.send(result);
    });
    app.patch("/ordersAll/:id", async (req, res) => {
      const id = req.params.id;
      const { status, doneDate } = req.body;

      const result = await AllOrder.updateOne(
        { _id: new ObjectId(id) },
        { $set: { orderStatus: status, doneDate: doneDate } }
      );

      res.send(result);
    });

    app.delete("/ordersAll/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id, "cdced");
      const result = await AllOrder.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/orderData/:email", async (req, res) => {
      const { email } = req.params;
      const result = await AllOrder.find({ email }).toArray();
      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const mil = { email: email };
      const result = await AllUser.findOne(mil);
      res.send(result);
    });

    app.post("/allData", async (req, res) => {
      const body = req.body;
      const result = await AllData.insertOne(body);
      res.send(result);
    });
    app.post("/order", async (req, res) => {
      const body = req.body;
      const result = await AllOrder.insertOne(body);
      res.send(result);
    });
    app.get("/allData", async (req, res) => {
      try {
        const { sort = "desc" } = req.query;
        const cursor = AllData.find().sort({
          price: sort === "asc" ? 1 : -1,
        });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching allData:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/allData/:id", async (req, res) => {
      const id = req.params.id;
      const da = { _id: new ObjectId(id) };
      const result = await AllData.findOne(da);
      res.send(result);
    });
    app.delete("/allData/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const da = { _id: new ObjectId(id) };
      const result = await AllData.deleteOne(da);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
