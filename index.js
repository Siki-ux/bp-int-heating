"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceTrvValueList = exports.getDeviceParameterValueList = exports.db = exports.deviceList = exports.groups = exports.TRVs = exports.updateParams = exports.updatePID = void 0;
const HeatingControl_1 = require("./src/HeatingControl");
const fs = __importStar(require("fs"));
let params = {
    "tSens1": 23.89,
    "tSens2": 23.88,
    "lastT": 23.89,
    "TrvTT": 22,
    "TrvT": 22.18,
    "TrvMR": 516,
    "TrvMP": 253,
    "TrvC": 3,
    "integral": 0,
    "prevError": 0,
    "startTime": 0,
    "currTime": 0
};
function updatePID(prevError, integral) {
    params = {
        "tSens1": params.tSens1,
        "tSens2": params.tSens2,
        "lastT": params.lastT,
        "TrvTT": params.TrvTT,
        "TrvT": params.TrvT,
        "TrvMR": params.TrvMR,
        "TrvMP": params.TrvMP,
        "TrvC": params.TrvC,
        "integral": integral,
        "prevError": prevError,
        "startTime": params.startTime,
        "currTime": params.currTime
    };
}
exports.updatePID = updatePID;
function updateParams(tSens1, tSens2, lastT, TrvTT, TrvT, TrvMR, TrvMP, TrvC, integral, prevError, startTime, currTime) {
    params = {
        "tSens1": tSens1,
        "tSens2": tSens2,
        "lastT": lastT,
        "TrvTT": TrvTT,
        "TrvT": TrvT,
        "TrvMR": TrvMR,
        "TrvMP": TrvMP,
        "TrvC": TrvC,
        "integral": integral,
        "prevError": prevError,
        "startTime": startTime,
        "currTime": currTime
    };
    exports.deviceList = [
        {
            "id": 1,
            "value": tSens1
        },
        {
            "id": 2,
            "value": tSens2
        }
    ];
}
exports.updateParams = updateParams;
exports.TRVs = [
    {
        "id": 128,
        "mnSystemId": 15,
    }
];
exports.groups = [
    {
        "id": 3,
    }
];
exports.deviceList = [
    {
        "id": 1,
        "value": params.tSens1
    },
    {
        "id": 2,
        "value": params.tSens2
    }
];
exports.db = {
    "TRVs": []
};
function getDeviceParameterValueList(sensorID) {
    for (let index in exports.deviceList) {
        if (exports.deviceList[index].id == sensorID) {
            return [{ "value": exports.deviceList[index].value }];
        }
    }
    return [];
}
exports.getDeviceParameterValueList = getDeviceParameterValueList;
function getDeviceTrvValueList() {
    return [
        {
            "devParName": "motorPosition",
            "value": params.TrvMP
        }, {
            "devParName": "motorRange",
            "value": params.TrvMR
        }, {
            "devParName": "targetTemperature",
            "value": params.TrvTT
        }, {
            "devParName": "sensorTemperature",
            "value": params.TrvT
        }, {
            "devParName": "lastMeasuredTemperature",
            "value": params.lastT
        }, {
            "devParName": "coeficient",
            "value": params.TrvC
        }, {
            "devParName": "integral",
            "value": params.integral
        }, {
            "devParName": "prevError",
            "value": params.prevError
        }, {
            "devParName": "startTime",
            "value": params.startTime
        }, {
            "devParName": "currTime",
            "value": params.currTime
        }
    ];
}
exports.getDeviceTrvValueList = getDeviceTrvValueList;
function tempMovement(range, toMovePosition) {
    let c = (range - toMovePosition) / 1600;
    let cooling = -0.5 * Math.random();
    if (toMovePosition == 0)
        cooling * 2;
    let heating = c * (10);
    let res = heating + cooling;
    console.log(heating + "+" + cooling);
    console.log(res);
    return Math.round(res * 100) / 100;
}
console.log("***********START_test************");
let output = "./tests/output/output.txt";
process.argv.forEach(function (val, index, array) {
    if (index >= 2) {
        if (index == 2)
            output = val;
    }
});
let service = new HeatingControl_1.HeatingControl();
fs.writeFileSync("./tests/output/output.txt", "");
let target = 22;
let startT = 20;
let range = 800;
let c = 5;
let lastT = startT - (Math.random() * Math.random() * 2);
let now = Date.now();
let intervalInMinutes = 2880;
updateParams(startT, startT, lastT, target, startT, range, range, c, 0, 0, now, now);
let temperature = params.tSens1;
let move = Math.round(Math.random() * 100) / 100;
for (let time = 0; time < intervalInMinutes * 60 * 1000; time += 300000) {
    let data = service.HeatingControl().data;
    let res = data[0].value;
    let PID = data[2].value;
    let en = 0;
    move = tempMovement(params.TrvMR, res);
    temperature = (3 * Math.sin(time / (8640000 * 2)) + 20 + move + (0.1 * temperature));
    let text = PID + "\t" + temperature.toFixed(2) + "\t" + res + "\n";
    fs.appendFileSync("./tests/output/output.txt", text);
    updateParams(temperature, temperature, params.tSens1, target, temperature, range, res, c, params.integral, params.prevError, params.startTime, now + 300000);
}
