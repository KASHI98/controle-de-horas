const Storage = {
    get() { return JSON.parse(localStorage.getItem("horas:data")) || []; },
    save(data) { localStorage.setItem("horas:data", JSON.stringify(data)); }
};