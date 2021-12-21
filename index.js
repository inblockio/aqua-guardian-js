const fs = require("fs")

const express = require("express")
const { AuthorizationCode } = require("simple-oauth2")
const fetch = require("node-fetch")

const externalVerifier = require("data-accounting-external-verifier")

const app = express()
const PORT = 8047

const MWUrl = "http://localhost:9352"
const ownUrl = `http://localhost:${PORT}`
const callbackUrl = ownUrl + "/callback"

const OAuth2Client = new AuthorizationCode({
  client: {
    id: "c67ab85d6d7c27fcb040ba71863cbf1a",
    secret: "eac7276993b647e23db8e1ec1277245da8e98a00",
  },
  auth: {
    tokenHost: MWUrl,
    tokenPath: "/rest.php/oauth2/access_token",
    authorizePath: "/rest.php/oauth2/authorize",
  },
})

function persistAccessTokenJSON(accessTokenJSONString) {
  fs.writeFileSync("accessToken.json", accessTokenJSONString)
}

async function getPersistedAccessTokenJSON() {
  if (!fs.existsSync("accessToken.json")) {
    console.log("acessToken.json does not exist")
    return null
  }
  const accessTokenJSONString = fs.readFileSync("accessToken.json")
  let accessToken = OAuth2Client.createToken(JSON.parse(accessTokenJSONString))
  if (accessToken.expired()) {
    console.log("Access token is expired. Refreshing...")
    try {
      accessToken = await accessToken.refresh()
      persistAccessTokenJSON(JSON.stringify(accessToken))
      return accessToken
    } catch (error) {
      console.log("Error refreshing access token: ", error.message)
      return null
    }
  }
  return accessToken
}

app.get("/auth", (req, res) => {
  const authorizationUri = OAuth2Client.authorizeURL({
    redirect_uri: callbackUrl,
  })
  res.redirect(authorizationUri)
})

app.get("/callback", async (req, res) => {
  const { code } = req.query
  const options = {
    code: code,
    redirect_uri: callbackUrl,
  }
  try {
    const accessToken = (await OAuth2Client.getToken(options)).token
    persistAccessTokenJSON(JSON.stringify(accessToken))
    return res.status(200).json(true)
  } catch (error) {
    console.log("Access Token Error", error.message)
    return res.status(500).json("Authentication failed")
  }
})

app.get("/verify_page", async (req, res) => {
  if (!req.query.hasOwnProperty("page_title")) {
    return res.status(400).send("page_title query param is required.")
  }
  const accessToken = await getPersistedAccessTokenJSON()
  if (accessToken === null) {
    return res
      .status(400)
      .send(
        `<html>Visit <a href='/auth'>/auth</a> to authenticate this API server</html>`
      )
  }
  const page_title = req.query.page_title
  const verbose = false
  const doVerifyMerkleProof = false
  const [verificationStatus, details] = await externalVerifier.verifyPage(
    page_title,
    MWUrl,
    verbose,
    doVerifyMerkleProof,
    accessToken.token.access_token
  )
  if (verificationStatus == "ERROR") {
    res.send(details.error)
    return
  }

  const out = externalVerifier.formatPageInfo2HTML(
    MWUrl,
    page_title,
    verificationStatus,
    details,
    verbose
  )
  const now = new Date()
  // The month needs to be offset by 1 because it starts from 0 instead of 1.
  const guardianTimestamp = `${now.getFullYear()}${now.getMonth() + 1}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}${now.getUTCSeconds()}`

  console.log("Calling the write API to the PKC...")
  for (const detail of details.revision_details) {
    const body = {
      verification_hash: detail.verification_hash,
      status: detail.status,
      guardian_timestamp: guardianTimestamp,
      elapsed_time: '',
      guardian_id: '',
      request_hash: '',
      reply_hash: '',
    }
    const writeResult = await fetch(
      MWUrl + "/rest.php/data_accounting/v1/store_guardian_revision_verification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${accessToken.token.token_type} ${accessToken.token.access_token}`,
        },
        body: JSON.stringify(body),
      }
    )
    const resultContent = await writeResult.json()
    console.log("writeResult", resultContent)
  }
  res.send(out)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
