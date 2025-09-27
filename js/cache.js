class Cache {
  set(key, value, expirationDate = null) {
    const data = {
      value: value,
      expires: expirationDate ? expirationDate.getTime() : null,
    };

    let cookieString = `${key}=${encodeURIComponent(JSON.stringify(data))}; path=/`;

    if (expirationDate) {
      cookieString += `; expires=${expirationDate.toUTCString()}`;
    }

    document.cookie = cookieString;
  }

  get(key) {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(";");

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        try {
          const data = JSON.parse(c.substring(name.length, c.length));

          // Check if expired
          if (data.expires && Date.now() > data.expires) {
            this.delete(key);
            return false;
          }

          return data.value;
        } catch (e) {
          this.delete(key);
          return false;
        }
      }
    }
    return false;
  }

  delete(key) {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  }
}
