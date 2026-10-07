function escapeLDAP(str) {
  return str.replace(/[\\*()\0]/g, (char) => {
    return '\\' + char.charCodeAt(0).toString(16).padStart(2, '0');
  });
}
console.log(escapeLDAP("user(name)")); // user\28name\29
