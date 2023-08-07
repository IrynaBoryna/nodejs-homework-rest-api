const { User } = require("../Service/schemas/users");

const {ctrlWrapper, HttpError, sendEmail} = require("../Helpers");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const gravatar = require("gravatar");
const path = require('path');
const Jimp = require("jimp");
const { nanoid } = require('nanoid');

const {SECRET_KEY, BASE_URL} = process.env;

const avatarDir = path.join(__dirname, '../', "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email in use");
  }
  const hashPassword = await bcrypt.hash(password, 6);
  const avatarUrl = gravatar.url(email);
  const verificationToken = nanoid();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarUrl,
    verificationToken,
  });

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target = "_blank" href ="${BASE_URL}/api/users/verify/${verificationToken}">Click verify email</a>`,
  };

  await sendEmail(verifyEmail);

  res.status(201).json({
    email: newUser.email,
    subscription: newUser.subscription,
    password: newUser.password,
    avatarUrl: newUser.avatarUrl,
  });
};

const verifyEmail = async (req, res) => {
   const { verificationToken } = req.params;
   const user = await User.findOne({ verificationToken });
   if (!user) {
     throw HttpError(404, "User not found");
  }

  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });
  res.status(200).json({ message: "Verification successful" });
};

const resedVerify = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(400, "missing required field email");
  }
  if (user.verify) {
   throw HttpError(400, "Verification has already been passed");
  }
   const verifyEmail = {
     to: email,
     subject: "Verify email",
     html: `<a target = "_blank" href ="${BASE_URL}/api/users/verify/${user.verificationToken}">Click verify email</a>`,
   };

   await sendEmail(verifyEmail);

  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });
  res.status(200).json({ message: "Verification email sent" });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }

  if (!user.verify) {
    throw HttpError(401, "Email not verify");
  }
 
  const comparePassword = await bcrypt.compare(password, user.password);
  if (!comparePassword) {
    throw HttpError(401, "Email or password is wrong");
  }
  const payload = { id: user.id };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "3h" });

  await User.findByIdAndUpdate(user._id, { token });

  res.status(200).json({
    token: token,
    user: { email: user.email, subscription: user.subscription },
  });
};

const logout = async (req, res) => {
  const { id } = req.user;
  console.log(id)
  await User.findByIdAndUpdate({ _id: id }, { token: " " });
  res.status(204).json({ message: "No content" });
};

const currentUser = async (req, res) => {
  const { email, subscription } = req.user;
  res.json({ email, subscription });
};

const updateSubscription = async (req, res) => {
      const { id } = req.user;
      const data = await User.findOneAndUpdate({ _id: id }, req.body, {
        new: true,
      });
      if (!data) {
        throw HttpError(404, "Not found");
      }
      res.status(200).json(data);
};

const updateAvatar = async (req, res) => {
  const { id } = req.user;

  const { path: tempDir, originalname } = req.file;
   const img = await Jimp.read(tempDir);
  await img.resize(250, 250).write(tempDir);
   const filename = `${id}_small_${originalname}`;
  const resultDir = path.join(avatarDir, filename);
  await fs.rename(tempDir, resultDir);
  const avatarUrl = path.join("avatars", filename);

  await User.findOneAndUpdate({ _id: id }, {avatarUrl});

  res.status(200).json(`avatarUrl: ${avatarUrl}`);
};

// const getContactFavorite = async (req, res) => {
//   const { favorite } = req.query;
//   console.log(favorite)
//   const data = await Contact.find({ favorite});
//   if (!data) {
//     throw HttpError(404, "Not found");
//   }
//   res.json(data);
// };


module.exports = {
  register: ctrlWrapper(register),
  verifyEmail: ctrlWrapper(verifyEmail),
  resedVerify: ctrlWrapper(resedVerify),
  login: ctrlWrapper(login),
  logout: ctrlWrapper(logout),
  updateSubscription: ctrlWrapper(updateSubscription),
  currentUser: ctrlWrapper(currentUser),
  updateAvatar: ctrlWrapper(updateAvatar),
};
