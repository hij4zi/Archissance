/* POST /api/contact — the site's contact form. Two independent, best-effort
   channels record every enquiry so neither one's failure loses a submission:

     - Email notification via GoDaddy Node.js Hosting's email gateway (see
       ~/.claude/skills/godaddy-nodejs-hosting/email.md) — the real-time
       notification to CONTACT_FORM_RECIPIENT_EMAIL.
     - A durable row in managed MySQL (build/db.mjs) — a backup record that
       survives even if the email gateway or recipient config has a problem.

   The request only fails if BOTH channels fail — otherwise the enquiry was
   captured by at least one of them.

   Handles two submission modes so the form still works with JavaScript
   disabled, matching this project's "everything degrades" convention
   (assets/js/main.js):

     - JS-enhanced (assets/js/main.js intercepts submit, POSTs JSON,
       shows an inline success/error message) -> responds JSON.
     - Plain HTML form POST (no JS) -> application/x-www-form-urlencoded,
       responds with a 303 redirect back to contact.html so a page
       refresh doesn't resubmit.

   Locally (no GoDaddy container / no managed MySQL configured), both
   sendEmail() and saveEnquiry() throw ("email gateway unreachable" / "database
   not configured") — that's expected; the route still exercises validation
   and response logic correctly, it just can't complete a real send or save
   outside the platform. */
import { sendEmail } from "./email.mjs";
import { saveEnquiry } from "./db.mjs";

const MAX_BODY_BYTES = 64 * 1024; // a contact form has no business being larger

function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseFields(raw, contentType) {
  if (contentType.includes("application/json")) {
    const data = JSON.parse(raw || "{}");
    return { fields: data, isJson: true };
  }
  // application/x-www-form-urlencoded (native <form method="POST"> submit)
  const fields = Object.fromEntries(new URLSearchParams(raw));
  return { fields, isJson: false };
}

function respondJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function respondRedirect(res, query) {
  res.writeHead(303, { location: `/contact.html?${query}` });
  res.end();
}

export async function handleContact(req, res) {
  let isJson = false;
  try {
    const raw = await readBody(req);
    const contentType = req.headers["content-type"] || "";
    const parsed = parseFields(raw, contentType);
    const fields = parsed.fields;
    isJson = parsed.isJson;

    const name = String(fields.name || "").trim();
    const email = String(fields.email || "").trim();
    const message = String(fields.message || "").trim();
    const projectType = String(fields.project_type || "").trim();

    if (!name || !email || !message) {
      const msg = "Please fill in your name, email, and message.";
      return isJson ? respondJson(res, 400, { error: msg }) : respondRedirect(res, "sent=0");
    }
    // basic shape check — not full RFC 5322 validation, just catches typos
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = "That email address doesn't look right.";
      return isJson ? respondJson(res, 400, { error: msg }) : respondRedirect(res, "sent=0");
    }

    let dbSaved = false;
    try {
      await saveEnquiry({ name, email, projectType, message });
      dbSaved = true;
    } catch (err) {
      console.error("enquiry.db_save.failed", err);
    }

    let emailSent = false;
    const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
    if (!recipient) {
      // Never send to nowhere — but this alone doesn't fail the request when
      // the DB save above succeeded; the enquiry is still on record.
      console.error("email.contact_form.recipient_unset");
    } else {
      try {
        const bodyLines = [
          `From: ${name} (${email})`,
          projectType ? `Project type: ${projectType}` : null,
          "",
          message,
        ].filter((l) => l !== null);

        await sendEmail({
          to: recipient,
          replyTo: email,
          subject: `Contact form: ${name}`,
          text: bodyLines.join("\n"),
          // No html field — user input must not be interpolated into HTML without escaping.
        });
        emailSent = true;
      } catch (err) {
        console.error("email.send.failed", err);
      }
    }

    if (dbSaved || emailSent) {
      return isJson ? respondJson(res, 200, { success: true }) : respondRedirect(res, "sent=1");
    }

    const msg = "We couldn't send your message — please try again or email us directly.";
    return isJson ? respondJson(res, 500, { error: msg }) : respondRedirect(res, "sent=0");
  } catch (err) {
    console.error("contact.unexpected_error", err);
    const msg = "We couldn't send your message — please try again or email us directly.";
    return isJson ? respondJson(res, 500, { error: msg }) : respondRedirect(res, "sent=0");
  }
}
