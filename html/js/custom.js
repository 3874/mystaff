/**
 *
 * You can write your JS code here, DO NOT touch the default style file
 * because it will make it harder for you to update.
 * 
 */

"use strict";

function CheckSignIn() {
  const myprofileJSON = localStorage.getItem("mystaffInfo");
  if (!myprofileJSON) {
    location.href = "./signin.html";
  }
  return myprofileJSON;
}

$('#signout-btn').on('click', function() {
    localStorage.removeItem("mystaffInfo");
    location.href = "./signin.html";
});