const Busboy = require("busboy");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { db } = require("../util/admin");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();

exports.addItem = (req, res) => {
  const busboy = new Busboy({
    headers: req.headers
  });
  let uploadData = null;
  let link = null;
  let errors = {};

  if (!req.query.title.length) {
    errors["titleError"] = "Додайте заголовок";
  }

  if (!req.query.location.length) {
    errors["locationError"] = "Додайте місце знаходження речі";
  }

  if (!req.query.description.length) {
    errors["descriptionError"] = "Додайте опис знайденої речі";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const itemInfo = req.query;

  itemInfo["date"] = new Date().toLocaletring();
  itemInfo["title"] = itemInfo["title"].toLowerCase();
  itemInfo["location"] = itemInfo["location"].toLowerCase();
  itemInfo["description"] = itemInfo["description"].toLowerCase();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Фото повинно мати формат jpeg або png" });
    }

    link = new Date().getTime() + filename;
    const filepath = path.join(os.tmpdir(), link);
    uploadData = { file: filepath, type: mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    const bucketName = "buro-c4d93.appspot.com";
    storage
      .bucket(bucketName)
      .upload(uploadData.file, {
        uploadType: "media",
        metadata: {
          metadata: {
            contentType: uploadData.type
          }
        }
      })
      .then(() => {
        link =
          "https://firebasestorage.googleapis.com/v0/b/buro-c4d93.appspot.com/o/" +
          link +
          "?alt=media";
        db.collection("items").add({ imgUrl: link, ...itemInfo });
      })
      .then(() => {
        return res.status(200).json({
          message: "Успішно додано"
        });
      })
      .catch(err => {
        return res
          .status(500)
          .json({ error: "Помилка відправлення" });
      });
  });
  busboy.end(req.rawBody);
};

exports.getItem = (req, res) => {
  const id = req.query.itemId;
  db.collection("items")
    .doc(id)
    .get()
    .then(doc => {
      return res.status(200).json({
        id: doc.id,
        ...doc.data()
      });
    })
    .catch(e => {
      return res.status(500).json({ error: 'Неможливо завантажити дану річ' });
    });
};

exports.getItems = (req, res) => {
  const items = [];
  db.collection("items")
    .get()
    .then(snap => {
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      return res.status(200).json({
        items
      });
    })
    .catch(e => {
      return res.status(500).json({
        error: "Неможливо завантажити речі"
      });
    });
};

exports.getItemsFromSearch = (req, res) => {
  const text = req.body.text;
  const items = [];
  db.collection("items")
    .orderBy("title")
    .startAt(text)
    .limit(10)
    .get()
    .then(snapshot => {
      snapshot.forEach(item => {
        items.push({ id: item.id, title: item.data().title });
      });
      return res.status(200).json({ items, snapshot });
    })
    .catch(e => {
      return res.status(400).json({ error: e });
    });
};

exports.sendMessage = (req, res) => {
  const message = req.body.message;
  const date = new Date().toLocaleString();
  if (message.length) {
    db.collection("messages")
      .add({
        message,
        date
      })
      .then(() => {
        return res.status(200).json({
          message: "Повідомлення відправлено"
        });
      })
      .catch(e => {
        return res.status(500).json({
          error: "Помилка відправлення повідомлення"
        });
      });
  }
};
