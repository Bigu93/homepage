const dateDiffInMinutes = (a, b) => {
  a = parseInt(a);
  b = parseInt(b);
  const _MS_PER_MIN = 1000 * 60;
  let res = Math.floor((b - a) / _MS_PER_MIN);
  return res;
};

const render = (text, needsMarkup = true) => {
  if (needsMarkup) {
    output.innerHTML += `<p>${text}</p>`;
  } else {
    output.innerHTML += text;
  }
  input.focus();
};

const error = (color, type, message) => {
  render(`<p><span class="${color}">${type}</span>: ${message}</p>`);
};

const getWeather = () => {
  let loc = localStorage.getItem("loc");
  let WEATHER_API_KEY = localStorage.getItem("WEATHER_API_KEY");
  if (!loc || !WEATHER_API_KEY) {
    error(
      "red",
      "Unauthorized",
      "API key and location are not set, run `weather set` for instructions"
    );
    return;
  }
  let cached = localStorage.getItem("cachedWeather");
  if (cached) {
    cached = JSON.parse(cached);
    if (dateDiffInMinutes(cached.fetchedAt, Date.now()) < 15) {
      render(
        `It's ${cached.temp} °F out in ${cached.name}, ${cached.state}. Expect ${cached.desc}.`
      );
      return;
    }
  }
  fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${loc}&appid=${WEATHER_API_KEY}`
  )
    .then((geoRes) => geoRes.json())
    .then((geoData) => {
      geoData = geoData[0];
      let cacheData = { ...geoData };
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=${geoData.lat}&lon=${geoData.lon}&appid=${WEATHER_API_KEY}`
      )
        .then((weatherRes) => weatherRes.json())
        .then((weatherData) => {
          cacheData = {
            ...cacheData,
            icon: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`,
            desc: weatherData.weather[0].description,
            temp: Math.floor(weatherData.main.temp),
            fetchedAt: Date.now().toString(),
          };
          render(
            `It's ${cacheData.temp} °F out in ${cacheData.name}, ${cacheData.state}. Expect ${cacheData.desc}.`
          );
          localStorage.setItem("cachedWeather", JSON.stringify(cacheData));
        })
        .catch((e) => {
          error("red", "Weather API Error", e);
          console.log(e);
        });
    })
    .catch((e) => {
      error("red", "Weather API Error", e);
      console.log(e);
    });
};

const getDate = () => {};

const attachLinkNavigation = () => {
  const links = document.querySelectorAll(".link-item");
  let currentIndex = 0;

  const updateFocus = (index) => {
    links.forEach((link, i) => {
      if (i === index) {
        link.classList.add("focused");
      } else {
        link.classList.remove("focused");
      }
    });
  };

  if (links.length > 0) updateFocus(currentIndex);

  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowUp":
        currentIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
        updateFocus(currentIndex);
        break;
      case "ArrowDown":
        currentIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
        updateFocus(currentIndex);
        break;
      case "Enter":
        window.open(links[currentIndex].href, "_blank");
        break;
    }
  });
};

export {
  render,
  error,
  getWeather,
  getDate,
  dateDiffInMinutes,
  attachLinkNavigation,
};
