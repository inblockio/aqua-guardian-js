const express = require("express")

const externalVerifier = require("data-accounting-external-verifier")

const app = express()
const PORT = 8047

app.get("/verify_page", async (req, res) => {
  if (!req.query.hasOwnProperty("page_title")) {
    return res.status(400).send("page_title query param is required.")
  }
  const page_title = req.query.page_title
  const serverUrl = "http://localhost:9352"
  const verbose = false
  const doLog = false
  const doVerifyMerkleProof = false
  const [verificationStatus, details] = await externalVerifier.verifyPage(
    page_title,
    serverUrl,
    verbose,
    doLog,
    doVerifyMerkleProof
  )

  const out = externalVerifier.formatPageInfo2HTML(
    serverUrl,
    page_title,
    verificationStatus,
    details,
    verbose
  )
  res.send(out)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
