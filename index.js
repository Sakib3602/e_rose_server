const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
app.use(cors());
app.use(express.json());
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

    app.post("/user", async (req, res) => {
      const body = req.body;
      if (await AllUser.findOne({ email: body?.email })) {
        return;
      }
      const result = await AllUser.insertOne(body);
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
