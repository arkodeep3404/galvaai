const express = require("express");
const router = express.Router();
const zod = require("zod");
const { User } = require("../dbSchema");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/middleware");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

router.get("/", (req, res) => {
  res.status(200).json({
    message: "server running",
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(403).json({
      message: "not logged in",
    });
  }

  const user = await User.findById(userId);

  res.status(200).json({
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

router.get("/all", async (req, res) => {
  const users = await User.find({});

  res.status(200).json({
    users,
  });
});

router.delete("/delete", authMiddleware, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(403).json({
      message: "not logged in",
    });
  }

  const user = await User.deleteOne(userId);

  res.status(200).json({
    message: "user deleted",
  });
});

const signupBody = zod.object({
  email: zod.string().email(),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string(),
});

router.post("/signup", async (req, res) => {
  const { success } = signupBody.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "incorrect inputs",
    });
  }

  const existingUser = await User.findOne({
    email: req.body.email,
  });

  if (existingUser) {
    return res.status(411).json({
      message: "email already exists",
    });
  }

  const uid = [...Array(10)].map(() => Math.random().toString(36)[2]).join("");

  const user = await User.create({
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    isVerified: false,
    token: uid,
  });

  await transporter.sendMail({
    from: '"Galva AI" <no-reply@galva.ai>',
    to: req.body.email,
    subject: "Email Verification",
    html: `<p>Hallo ${req.body.firstName},<br>
    Herzlich willkommen bei GALVA.AI! Wir freuen uns, Sie als neues Mitglied begrüßen zu dürfen.<br><br>
    Um Ihre Registrierung abzuschließen und alle Funktionen von GALVA.AI nutzen zu können, bitten wir
    Sie, Ihre E-Mail-Adresse zu bestätigen. Klicken Sie dazu einfach auf den folgenden Link:<br><br>
    <a href = "${process.env.BACKEND_URL}v1/user/verify/${uid}"> Verification Link </a><br><br>
    Nach Bestätigung Ihrer E-Mail erhalten Sie vollen Zugriff auf alle Funktionen unserer Plattform.<br><br>
    Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br><br><br>
    Freundliche Grüße,<br><br>
    Patrick Boehm<br>
    Founder GALVA.AI<br><br></p>`,
  });

  res.status(200).json({
    message: "user created. please verify email.",
  });
});

const signinBody = zod.object({
  email: zod.string().email(),
  password: zod.string(),
});

router.post("/signin", async (req, res) => {
  const { success } = signinBody.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "incorrect email or password",
    });
  }

  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password,
  });

  if (user) {
    const isVerified = user.isVerified;

    if (isVerified) {
      const userId = user._id;

      const token = jwt.sign(
        {
          userId,
        },
        process.env.JWT_SECRET
      );

      res.status(200).json({
        token: token,
      });
    } else {
      res.status(403).json({
        message: "please verify email",
      });
    }
  } else {
    res.status(404).json({
      message: "no user exists",
    });
  }
});

router.get("/verify/:token", async (req, res) => {
  token = req.params.token;

  const user = await User.findOneAndUpdate(
    {
      token: token,
    },
    {
      $set: {
        isVerified: true,
        token: "",
      },
    }
  );

  if (!user) {
    res.status(404).json({
      message: "incorrect token",
    });
  } else {
    res.status(200).json({
      message: "email verified. please signin",
    });
  }
});

router.post("/forgot", async (req, res) => {
  const uid = [...Array(10)].map(() => Math.random().toString(36)[2]).join("");

  const user = await User.findOneAndUpdate(
    {
      email: req.body.email,
    },
    {
      $set: {
        token: uid,
      },
    }
  );

  if (!user) {
    res.status(404).json({
      message: "incorrect email",
    });
  } else {
    await transporter.sendMail({
      from: '"Galva AI" <no-reply@galva.ai>',
      to: req.body.email,
      subject: "Reset Password",
      html: `<p> Hi ${user.firstName}. Please use the link to reset password. </p> 
      <a href = "${process.env.FRONTEND_URL}reset/${uid}"> Click here </a>`,
    });

    res.status(200).json({
      message: "please check email to reset password",
    });
  }
});

router.put("/reset/:token", async (req, res) => {
  token = req.params.token;

  const user = await User.findOneAndUpdate(
    {
      token: token,
    },
    {
      $set: {
        password: req.body.password,
        token: "",
      },
    }
  );

  if (!user) {
    res.status(404).json({
      message: "incorrect token",
    });
  } else {
    res.status(200).json({
      message: "password updated",
    });
  }
});

router.post("/resend", async (req, res) => {
  const uid = [...Array(10)].map(() => Math.random().toString(36)[2]).join("");

  const user = await User.findOneAndUpdate(
    {
      email: req.body.email,
    },
    {
      $set: {
        token: uid,
      },
    }
  );

  if (!user) {
    res.status(404).json({
      message: "incorrect email",
    });
  } else {
    await transporter.sendMail({
      from: '"Galva AI" <no-reply@galva.ai>',
      to: req.body.email,
      subject: "Email Verification",
      html: `<p> Hi ${user.firstName}. Please verify your email. </p> 
    <a href = "${process.env.BACKEND_URL}v1/user/verify/${uid}"> Click Here </a>`,
    });

    res.status(200).json({
      message: "email sent. please verify",
    });
  }
});

router.put("/update", authMiddleware, async (req, res) => {
  const user = await User.findOneAndUpdate(
    {
      _id: req.userId,
    },
    {
      $set: {
        password: req.body.password,
      },
    }
  );

  if (!user) {
    res.status(403).json({
      message: "incorrect headers",
    });
  } else {
    res.status(200).json({
      message: "password updated",
    });
  }
});

module.exports = router;
