module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  const gasUrl = process.env.GAS_URL;

  if (!gasUrl) {
    return res.status(500).send("Missing GAS_URL");
  }

  try {
    const payload = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload || {})
    });

    const resultText = await gasResponse.text();

    res.status(gasResponse.status);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send(resultText);
  } catch (error) {
    return res.status(500).send(error && error.stack ? error.stack : String(error));
  }
};
