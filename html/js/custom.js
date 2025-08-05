/**
 *
 * You can write your JS code here, DO NOT touch the default style file
 * because it will make it harder for you to update.
 * 
 */

"use strict";

function CheckSignIn() {
  const mystaffJSON = localStorage.getItem("mystaffInfo");
  if (!mystaffJSON) {
    location.href = "./signin.html";
  }
  return mystaffJSON;
}

$('#signout-btn').on('click', function() {
    localStorage.removeItem("mystaffInfo");
    location.href = "./signin.html";
});