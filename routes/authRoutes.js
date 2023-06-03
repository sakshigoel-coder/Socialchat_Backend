const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
require('dotenv').config();
const nodemailer = require("nodemailer");


// router.get('/home', (req, res) => {
//     res.send("Hello World");
// })

async function mailer(recievermail,code) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS:true, // true for 465, false for other ports
      auth: {
        user: 'goyalsakshi907@gmail.com', // generated ethereal user
        pass: 'uyeoxiczxdfhulkn', // generated ethereal password
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: 'goyalsakshi907@gmail.com', // sender address
      to: `${recievermail}`, // list of receivers
      subject: "Signup Verification", // Subject line
      text: "Hello world?", // plain text body
      html: `<b>Your Verification Code:${code}</b>`, // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }

  router.post('/verify', (req, res) => {
    console.log('sent by client', req.body);
    const { email } = req.body;

    if (!email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }

    User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
            return res.status(422).json({ error: "Invalid Credentials" });
        }
        try {
            let VerificationCode = Math.floor(100000 + Math.random() * 900000);
            await mailer(email, VerificationCode);
            console.log("Verification Code", VerificationCode);
            res.send({ message: "Verification Code Sent to your Email", VerificationCode, email });
        }
        catch (err) {
            console.log(err);
        }
    }
    )
})

  
router.post('/changeusername', (req, res) => {
  const { username, email } = req.body;

  User.find({ username }).then(async (savedUser) => {
      if (savedUser.length > 0) {
          return res.status(422).json({ error: "Username already exists" });
      }
      else {
          return res.status(200).json({ message: "Username Available", username, email });
      }
  })
});

router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
      return res.status(422).json({ error: "Please add all the fields" });
  }
  else {
      const user = new User({
          username,
          email,
          password,
      })

      try {
          await user.save();
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
          return res.status(200).json({ message: "User Registered Successfully", token });

      }
      catch (err) {
          console.log(err);
          return res.status(422).json({ error: "User Not Registered" });
      }
  }
});

router.post('/verifyfp', (req, res) => {
  console.log('sent by client', req.body);
  const { email } = req.body;

  if (!email) {
      return res.status(422).json({ error: "Please add all the fields" });
  }

  User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
          try {
              let VerificationCode = Math.floor(100000 + Math.random() * 900000);
              await mailer(email, VerificationCode);
              console.log("Verification Code", VerificationCode);
              res.send({ message: "Verification Code Sent to your Email", VerificationCode, email });
          }
          catch (err) {
              console.log(err);
          }
      }
      else {
          return res.status(422).json({ error: "Invalid Credentials" });
      }
  }
  )
});


router.post('/resetpassword', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(422).json({ error: "Please add all the fields" });
  }
  else {
      User.findOne({ email: email })
          .then(async (savedUser) => {
              if (savedUser) {
                  savedUser.password = password;
                  savedUser.save()
                      .then(user => {
                          res.json({ message: "Password Changed Successfully" });
                      })
                      .catch(err => {
                          console.log(err);
                      })
              }
              else {
                  return res.status(422).json({ error: "Invalid Credentials" });
              }
          })
  }

});


router.post('/signin', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(422).json({ error: "Please add all the fields" });
  }
  else {
      User.findOne({ email: email })
          .then(savedUser => {
              if (!savedUser) {
                  return res.status(422).json({ error: "Invalid Credentials" });
              }
              else {
                  console.log(savedUser);
                  bcrypt.compare(password, savedUser.password)
                      .then(
                          doMatch => {
                              if (doMatch) {
                                  const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET);

                                  const { _id, username, email } = savedUser;

                                  res.json({ message: "Successfully Signed In", token, user: { _id, username, email } });
                              }
                              else {
                                  return res.status(422).json({ error: "Invalid Credentials" });
                              }
                          }
                      )
                  // res.status(200).json({ message: "User Logged In Successfully", savedUser });
              }
          })
          .catch(err => {
              console.log(err);
          })
  }
});

router.post('/userdata', (req, res) => {
    const { authorization } = req.headers;
    //    authorization = "Bearer afasgsdgsdgdafas"
    if (!authorization) {
        return res.status(401).json({ error: "You must be logged in, token not given" });
    }
    const token = authorization.replace("Bearer ", "");
    console.log(token);

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: "You must be logged in, token invalid" });
        }
        const { _id } = payload;
        User.findById(_id).then(userdata => {
            res.status(200).send({
                message: "User Found",
                user: userdata
            });
        })

    })
})

// change password
router.post('/changepassword', (req, res) => {
    const { oldpassword, newpassword, email } = req.body;

    if (!oldpassword || !newpassword || !email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    else {
        User.findOne({ email: email })
            .then(async savedUser => {
                if (savedUser) {
                    bcrypt.compare(oldpassword, savedUser.password)
                        .then(doMatch => {
                            if (doMatch) {
                                savedUser.password = newpassword;
                                savedUser.save()
                                    .then(user => {
                                        res.json({ message: "Password Changed Successfully" });
                                    })
                                    .catch(err => {
                                        // console.log(err);
                                        return res.status(422).json({ error: "Server Error" });

                                    })
                            }
                            else {
                                return res.status(422).json({ error: "Invalid Credentials" });
                            }
                        })

                }
                else {
                    return res.status(422).json({ error: "Invalid Credentials" });
                }
            })
    }
})

router.post('/setusername', (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }

    User.find({ username }).then(async (savedUser) => {
        if (savedUser.length > 0) {
            return res.status(422).json({ error: "Username already exists" });
        }
        else {
            User.findOne({ email: email })
                .then(async savedUser => {
                    if (savedUser) {
                        savedUser.username = username;
                        savedUser.save()
                            .then(user => {
                                res.json({ message: "Username Updated Successfully" });
                            })
                            .catch(err => {
                                return res.status(422).json({ error: "Server Error" });
                            })
                    }
                    else {
                        return res.status(422).json({ error: "Invalid Credentials" });
                    }
                })
        }
    })




})

router.post('/setdescription', (req, res) => {
    const { description, email } = req.body;
    if (!description || !email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }

    User.findOne({ email: email })
        .then(async savedUser => {
            if (savedUser) {
                savedUser.description = description;
                savedUser.save()
                    .then(user => {
                        res.json({ message: "Description Updated Successfully" });
                    })
                    .catch(err => {
                        return res.status(422).json({ error: "Server Error" });
                    })
            }
            else {
                return res.status(422).json({ error: "Invalid Credentials" });
            }
        })
})



module.exports = router;