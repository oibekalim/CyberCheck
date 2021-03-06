var CybertekTeam = require('../models/cybertekTeam');
var Request = require('../models/request');

var async = require('async');
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config');

//LogIn function for Admin. Authontication
exports.admin_logIn = function(req, res) {
  // asign session to null if any exist
  req.session = null;

  CybertekTeam.findOne({ email: req.body.email }, function (err, user) {
    if (err) return res.status(500).send('Error on the server.');
    if (!user) return res.status(404).send('No user found.');
    var passwordIsValid = bcrypt.compareSync(req.body.password_logIn, user.password);
    if (!passwordIsValid){
       return res.status(401).send({ auth: false, token: null });
     }
        var token =
        {
           userId : jwt.sign({ id: user._id }, config.secret, {
          expiresIn: 86400 // expires in 24 hours
        })
        }
      var cookie = req.session;

      if (!cookie) {
          req.session = token;
      } else {
         console.log('Valid cookie session');
      }

      console.log('Role: '+user.role);
      if(user.role === 'administrator'){

        res.status(200).redirect('/admin_profile');
      }else{

        res.status(200).redirect('/oldFriend_profile');
      }

  });
};

exports.admin_profile = function(req, res){
  var token = req.session.userId;
  if (!token){
    return res.status(401).send({ auth: false, message: 'No token provided.' });
  }
  jwt.verify(token, config.secret, function(err, decoded) {
         if (err){
           return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
         }
         async.parallel({
           admin: function(callback){
             CybertekTeam.findById(decoded.id,{password:0}).exec(callback);
           },
           //Get all Old Friends here
           oldFriends: function(callback){
             CybertekTeam.find({role:'old friend'}).exec(callback);
           },
           requests: function(callback){
             Request.find({status:'Open',assigned_to:null}).populate('student').populate('project').exec(callback);
           }
         }, function(err,results){
           if (err) { return next(err); }
                 if (results.admin == null) { // No results.
                     var err = new Error('Admin not found');
                     err.status = 404;
                     return next(err);
                   }
            res.render('admin',{title: 'Admin Profile',admin : results.admin, requests: results.requests, oldFriends: results.oldFriends});
         });
       });
  };


  exports.assigne_request = function(req,res,next){
    const oldFriendId = req.query.oldFriendId;
    const requestId = req.query.requestId;
    async.parallel({
        oldFriend: function(callback){
            CybertekTeam.findById(oldFriendId,function(err, oldFriend){
                if(!oldFriend){
                    return next(err);
                }else{
                    var amount = oldFriend.amount_of_requests;
                    oldFriend.amount_of_requests = amount + 1;

                    oldFriend.save(function(error){
                        if(error){
                            return next(error);
                        }else{
                            console.log('Old Friend Updated successfully');
                        }
                    });
                }
            }).exec(callback);
        },
        request: function(callback){
            Request.findById(requestId,function(err,request){
                if(!request){
                    return next(err);
                }else{
                    request.assigned_to = oldFriendId;
                    request.status = 'Assigned';
                    request.save(function(error){
                        if(error){
                            return next(err);
                        }else{
                            console.log("Request updated");
                        }
                    });
                }
            }).exec(callback);
        }
    },function(err,results){
        if(results.oldFriend != null && results.request != null){
            res.send(results);
        }else{
            return next(err);
        }
    });
  };

  exports.getAvailableOldfriends = function(req,res){
    async.waterfall([
      function getNotAvailableOldF(notAvailCallback){
               Request.find({end_client_company:req.query.endClient,recruiter_company:req.query.recComp,
                  _id: { $ne: req.query.requestId }},'assigned_to',function(err,notAvailableOldFriends){
                    if(err){
                      notAvailCallback(err);
                    }else{
                      notAvailCallback(null,notAvailableOldFriends);
                    }
                  });
      },
      function getAvailableOldF(notAvailableOldFriends,availableCallback){
                 var ids = notAvailableOldFriends.map((val) => {
                 return val.assigned_to;
                 });
                 CybertekTeam.find({'_id': { $nin: ids}, role:'old friend'},function(err,availableOldFriends){
                      if(err){
                        availableCallback(err);
                      }else{
                        availableCallback(null);
                        res.send(availableOldFriends);
                      }
                 });
      }
      ], function (error) {
       if (error) {
        //handle readFile error or processFile error here
        console.log("Error occure");
      }
    });
  }

  exports.oldFriend_create_form = function(req, res, next) {
      res.render('oldFriend_create', { title: 'Create Old Friend'});
  };

  exports.oldFriend_create_post = function(req, res, next){
                var hashedPassword = bcrypt.hashSync(req.body.password, 8);
                var oldFriend = new CybertekTeam(
                    {
                      firstname: req.body.first_name,
                      lastname:req.body.last_name,
                      email: req.body.email,
                      password: hashedPassword,
                      phone_number: req.body.phone_number,
                      role: 'old friend',
                      amount_of_requests : 0
                    });
                oldFriend.save(function (err) {
                    if (err) return res.send("There was a problem registering the old friend.");
                    //  res.redirect('/lunch_createOldFriend_form');
                    res.status(201).send(oldFriend);
                });
            }
