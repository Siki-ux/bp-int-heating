"use strict";
/***
 * @author: xsikul@stud.fit.vutbr.cz, Jakub Sikula
 * This script serves as fictional database and simulates progress of temperature.
 */
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
exports.getDeviceTrvValueList = exports.getDeviceParameterValueList = exports.deviceList = exports.groups = exports.TRVs = exports.updatePID = void 0;
const HeatingControl_1 = require("./src/HeatingControl");
const fs = __importStar(require("fs"));
//global for all variables. Acts as database containing values from devices
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
//function which updates dummy database with data for PID
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
//function which updates whole dummy database
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
//global containing data about TRV, acts as dumy databse 
exports.TRVs = [
    {
        "id": 128,
        "mnSystemId": 15,
    }
];
//global containing data about groups, acts as dumy databse 
exports.groups = [
    {
        "id": 3,
    }
];
//global containing data about devices in group, acts as dumy databse 
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
//function which takes sensorID and returns array of JSON objects with data from dummy database
function getDeviceParameterValueList(sensorID) {
    for (let index in exports.deviceList) {
        if (exports.deviceList[index].id == sensorID) {
            return [{ "value": exports.deviceList[index].value }];
        }
    }
    return [];
}
exports.getDeviceParameterValueList = getDeviceParameterValueList;
//function which returns array of JSON objects with data from dummy database
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
//function which calculates movement of temperature based on last movement and movement of motor.
function tempMovement(range, toMovePosition, lastMove) {
    let heatCoef = 5;
    let coolCoef = -0.5;
    let cooling = coolCoef * Math.random();
    if (toMovePosition == 0)
        cooling * 1.5;
    let heating = (range - toMovePosition) / 800 * heatCoef;
    let res = heating + cooling + 0.5 * lastMove;
    return Math.round(res * 100) / 100;
}
//This function contains parameter sloving and cycle of simulation
function main() {
    //static parameters simulations
    let output = ".output/output.txt";
    let target = 22;
    let startT = 20;
    let range = 800;
    let c = 5;
    let lastT = startT - (Math.random() * Math.random() * 2);
    let intervalInMinutes = 2880;
    //command line parameters  sloving
    process.argv.forEach(function (val, index, array) {
        switch (index) {
            case 2:
                output = val;
                break;
            case 3:
                target = parseInt(val);
                break;
            case 4:
                startT = parseInt(val);
                break;
            case 5:
                range = parseInt(val);
                break;
            case 6:
                c = parseInt(val);
                break;
            case 7:
                intervalInMinutes = parseInt(val);
                break;
        }
    });
    //init of Heating control
    let service = new HeatingControl_1.HeatingControl();
    //Output file prepare
    fs.writeFileSync(output, "", { flag: 'w' });
    fs.appendFileSync(output, "PID\tTemperature\tMotorPosition\n");
    //time for PID regulation
    let now = Date.now();
    //init of dummy database
    updateParams(startT, startT, lastT, target, startT, range, range, c, 0, 0, now, now);
    let temperature = params.tSens1;
    let move = Math.round(Math.random() * 100) / 100;
    let lastMove = 0;
    //simulation cycle in ms
    for (let time = 0; time < intervalInMinutes * 60 * 1000; time += 300000) {
        //calculate Heating control
        let data = service.HeatingControl().data;
        let res = data[0].value;
        let PID = data[2].value;
        //update of temperature
        lastMove = move;
        move = tempMovement(params.TrvMR, res, lastMove);
        temperature = (3 * Math.sin(time / (8640000 * 2)) + 20 + move);
        //write to file results of test
        let text = temperature.toFixed(2) + "\t" + res + "\n";
        fs.appendFileSync(output, text);
        //update dummy database for next cycle
        updateParams(temperature, temperature, params.tSens1, target, temperature, range, res, c, params.integral, params.prevError, params.startTime, now + 300000);
    }
}
main();
