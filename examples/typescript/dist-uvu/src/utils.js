"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashify = exports.capitalize = void 0;
function capitalize(str) {
    return str[0].toUpperCase() + str.substring(1);
}
exports.capitalize = capitalize;
function dashify(str) {
    return str.replace(/([a-zA-Z])(?=[A-Z\d])/g, '$1-').toLowerCase();
}
exports.dashify = dashify;
