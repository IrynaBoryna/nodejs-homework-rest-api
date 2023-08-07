const { error } = require('console');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { META_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.meta.ua",
  port: 465,
  secure: true,
  auth: {
      user: "borisov_ka1997@meta.ua",
      pass: META_PASSWORD
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

const sendEmail = async (data) => {
    const email = { ...data, from: "borisov_ka1997@meta.ua" };
  await transport.sendMail(email);
  return true;
}

module.exports = sendEmail;


// const email = {
//   to: "fiwane3798@weizixu.com",
//   from: "borisov_ka1997@meta.ua",
//   subject: "Test email",
//   html: "<p><strong>Test email</strong></p>",
// };

// transport.sendMail(email)
//     .then(() => console.log("Email success"))
// .catch(error=> console.log(error.message))