const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const geohash = require("ngeohash");

firebase.initializeApp(functions.config().firebase);
const db = firebase.firestore();

exports.quotationsByLocation = functions.https.onRequest(
  async (request, response) => {
    const getGeohashRange = (latitude, longitude, distance) => {
      distance = distance * 0.621371; // from km to miles
      const lat = 0.0144927536231884; // degrees latitude per mile
      const lon = 0.0181818181818182; // degrees longitude per mile

      const lowerLat = parseFloat(latitude) - lat * distance;
      const lowerLon = parseFloat(longitude) - lon * distance;

      const upperLat = parseFloat(latitude) + lat * distance;
      const upperLon = parseFloat(longitude) + lon * distance;

      const lower = geohash.encode(lowerLat, lowerLon);
      const upper = geohash.encode(upperLat, upperLon);

      return { lower, upper };
    };

    const { latitude, longitude, distance } = request.query;
    const range = getGeohashRange(latitude, longitude, distance);

    const snapshot = await db
      .collection("quotations")
      .where("location_geohash", ">=", range.lower)
      .where("location_geohash", "<=", range.upper)
      .get();

    let docs = snapshot.docs.map(doc => {
      return Object.assign({ id: doc.id }, doc.data());
    });

    response.send(JSON.stringify(docs));
  }
);

exports.quotationsOnCreate = functions.firestore
  .document("quotations/{quotationId}")
  .onCreate((snapshot, _context) => {
    const { latitude, longitude } = snapshot.data().location;
    const location_geohash = geohash.encode(latitude, longitude);

    return snapshot.ref.set({ location_geohash }, { merge: true });
  });
