import { mapList, elementWise } from "../list-helpers";
import { typeCheck } from "../helpers";
import xen from "../constants";

xen.sin =  mapList(typeCheck(Math.sin, "number"));

xen.cos =  mapList(typeCheck(Math.cos, "number"));

xen.tan =  mapList(typeCheck(Math.tan, "number"));

xen.asin = mapList(typeCheck(Math.asin, "number"));

xen.acos = mapList(typeCheck(Math.acos, "number"));

xen.atan = mapList(typeCheck(Math.atan, "number"));

xen.log =  mapList(typeCheck(tune.Util.log, "number")); // tune version allows argument for base

xen.exp =  mapList(typeCheck(Math.exp, "number"));

xen.sqrt = mapList(typeCheck(Math.sqrt, "number"));

xen.max =  typeCheck(Math.max, "number");

xen.min =  typeCheck(Math.max, "number");

xen.pow =  elementWise(mapList(typeCheck(Math.pow, "number")));
