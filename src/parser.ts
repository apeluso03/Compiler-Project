import ohm, { grammar } from 'ohm-js';
import { toAST } from 'ohm-js/extras';
//const ohm = require('ohm-js');

import * as fs from 'fs/promises';

const grammarStr = grammar(`
Program {
Program = (FunDecl | Comment)*
FunDecl = FunDecl_Main | FunDecl_NonMain
FunDecl_Main = "fun main(): " Type "{" StatementList "return" Expression ";" "}"
FunDecl_NonMain = "fun " Identifier "(" ParamList ")" ":" Type "{" StatementList "return" Expression ";" "}"
ParamList = Param*
Param = Param_Comma | Param_NoComma
Param_NoComma = Identifier ":" Type
Param_Comma = "," Identifier ":" Type
Statement = Block | PutStmt | VarDecl | ExprStmt | Conditional | WhileStmt | Comment
Comment = "/*" alnum+ "*/"
VarDecl = "var " Identifier ": " Type #" = " Expression ";"
ExprStmt = Expression ";"
Conditional = IfElseStmt | IfStmt
IfStmt = "if" "(" Expression ")" Statement
IfElseStmt = "if" "(" Expression ")" Statement "else" Statement
PutStmt = "put " Identifier "=" Expression ";"
WhileStmt = "while" "(" Disjunction ")" Statement
Block = "{" StatementList "}"
StatementList = Statement*
Expression = Assignment
Assignment = Assignment_Var | Disjunction
Assignment_Var = Identifier #" = " Assignment
Disjunction = Disjunction_Or | Conjunction
Disjunction_Or = Disjunction "or" Conjunction
Conjunction = Conjunction_And | Equality
Conjunction_And = Conjunction "and" Equality
Equality = Equality_NEQ | Equality_EQ | Comparison
Equality_NEQ = Comparison "!=" Comparison
Equality_EQ = Comparison "==" Comparison
Comparison = Comparison_GE | Comparison_LE | Comparison_G | Comparison_L | Term
Comparison_GE = Term ">=" Term
Comparison_LE = Term "<=" Term
Comparison_G = Term ">" Term
Comparison_L = Term "<" Term
Term = Term_Plus | Term_Minus | Factor
Term_Plus = Term "+" Factor
Term_Minus = Term "-" Factor
Factor = Factor_Mult | Factor_Div | Factor_Mod | Unary
Factor_Mult = Factor "*" Unary
Factor_Div = Factor "/" Unary
Factor_Mod = Factor "%" Unary
Unary = Unary_Not | Unary_Neg | Primary
Unary_Not = "!" Primary
Unary_Neg = "-" Int
Call = Identifier "(" ParamValList ")"
ParamValList = ParamVal*
ParamVal = ParamVal_Comma | ParamVal_NoComma
ParamVal_Comma = "," Primary | "," Get
ParamVal_NoComma = Primary | Get
Primary = Get | Expr | Int | Bool | Char | Void
Get = Get_Call | Get_Identifier
Get_Call = "get" Call
Get_Identifier = "get" Identifier
Void = "Void"
Expr = "(" Expression ")"
Type = "Int" | "Bool" | "Char" | "Void"
Int = digit+
Bool = "TRUE" | "FALSE"
Char = "'" (alnum+)* "'"
Identifier = letter ("_" | alnum)*
}`);

function isTruthy(val) {
    return val !== 0 && val !== false;
}

const { exec } = require('child_process');
export const parse = (input: string, filename: string) => {
    const match = grammarStr.match(input);
    let matchResult;
    if(match.succeeded()) {
        console.log('Parsed Successfully!\nResult: ');
        matchResult = semantics(match).eval();
        const ascTextFile = semantics(match).toASC();
        const newFile = "compiled/" + filename.slice(filename.indexOf("/"), filename.indexOf("."));
        fs.writeFile(newFile + ".ts", ascTextFile, 'utf-8')
        exec('asc ' + newFile + '.ts -o '  + newFile + '.wasm', (err, stdout, stderr) => {
            if (err) {
                return;
            }
        });
    } 
    else {
        matchResult = 'Parsing Error: ' + match.message;
    }
    return matchResult;
}

    let keywords = ['break','as','any','switch',
                    'case','if','throw','else',
                    'var','number','string','get',
                    'module','type','instanceof',
                    'typeof','public','private',
                    'enum','export','finally','for',
                    'while','void','null','super',
                    'this','new','in','return','true',
                    'false','any','extends','static',
                    'let','package','implements',
                     'interface','function', 'new',
                      'try', 'yield', 'const', 'continue', 'catch'];
    let result: any = null;
    type v = {identifier: string, type: string, value: any};
    let vMap: Map<string, v> = new Map<string, v>;
    type func = {identifier: string, returnType: string, body: any, returnStmt: any, varMap: Map<string, v>};
    let funcMap: Map<string, func> = new Map<string, func>;

    const semantics = grammarStr.createSemantics().addOperation('eval', {
        Program(e) {
            e.eval();
            return result;
        },
        FunDecl(e) {
            return e.eval();
        },
        FunDecl_Main(main, type, lb, statementList, ret, expression, semi, rb) {
            if(statementList.eval()) {
                statementList.eval().children.forEach(element => {
                    element.eval();
                });
            }
            let t = type.sourceString;
            let val = expression.eval();
            if(t == "Bool") {
                if((val == true || val == false) && !Number.isInteger(val)) {
                    result = val;
                } 
                else {
                    console.log("typeError: Expecting Bool Type: " + this.sourceString);
                    throw new Error("typeError: Expecting Bool Type: " + this.sourceString);
                }
            } 
            else if (t == "Int") {
                if(Number.isInteger(val)) {
                    result = val;
                } 
                else {
                    console.log("typeError: Expecting Int Type: " + this.sourceString);
                    throw new Error("typeError: Expecting Int Type: " + this.sourceString);
                }
            } 
            else if (t == "Char") {
                if (typeof val === 'string' || val instanceof String) {
                    result = val;
                }
                else {
                    console.log("typeError: Expecting Char Type: " + this.sourceString);
                    throw new Error("typeError: Expecting Char Type: " + this.sourceString);
                }
            }
            else if (t == "Void") {
                if(val == null) {
                    result = val;
                } 
                else {
                    console.log("typeError: Expecting Void Type: " + this.sourceString);
                    throw new Error("typeError: Expecting Void Type: " + this.sourceString);
                }
            } 
            else {
                console.log("typeError: Unknown Type");
                throw new Error("typeError: Unknown Type");
            };
        },
        FunDecl_NonMain(fun, id, lp, paramList, rp, colon, type, lb, statementList, ret, expression, semi, rb) {
            let t = type.sourceString;
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            let bodyList = statementList.eval();
            let varm: Map<string, v> = new Map<string, v>;
            if(paramList.eval()) {
                paramList.eval().children.forEach(element => {
                    varm.set(element.eval().identifier, {identifier: element.eval().identifier, type: element.eval().type, value: element.eval().value});
                });
            }
            funcMap[idv] = {identifier: idv, returnType: t, body: bodyList, returnStmt: expression, varMap: varm};
        },
        ParamList(pl) {
            return pl;
        },
        Param(e) {
            return e.eval();
        },
        Param_NoComma(id, colon, t) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            let param: v = {identifier: idv, type: t.sourceString, value: ""}
            return param;
        },
        Param_Comma(comma, id, colon, t) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            let param: v = {identifier: idv, type: t.sourceString, value: ""}
            return param;
        },
        Statement(e) {
            return e.eval();
        },
        VarDecl(v, id, colon, type, eq, expression, semi) {
            let idval = id.sourceString;
            if(keywords.includes(idval)) {
                idval = idval + "0";
            }
            let t = type.sourceString;
            let val = expression.eval();
            if(t == "Bool") {
                if((val == true || val == false) &&  !Number.isInteger(val)) {
                    vMap.set(idval, {identifier: idval, type: t, value: val});
                } 
                else {
                    console.log("typeError: Expected Bool Type: " + this.sourceString);
                    throw new Error("typeError: Expected Bool Type: " + this.sourceString);
                }
            } 
            else if (t == "Int") {
                if(Number.isInteger(val)) {
                    vMap.set(idval, {identifier: idval, type: t, value: val});
                } 
                else {
                    console.log("typeError: Expected Int Type: " + this.sourceString);
                    throw new Error("typeError: Expected Int Type: " + this.sourceString);
                }
            } 
            else if (t == "Char") {
                if (typeof val === 'string' || val instanceof String) {
                    vMap.set(idval, {identifier: idval, type: t, value: val});
                }
                else {
                    console.log("typeError: Expected Char Type: " + this.sourceString);
                    throw new Error("typeError: Expected Char Type: " + this.sourceString);
                }
            }
            else if (t == "Void") {
                if(val == null) {
                    vMap.set(idval, {identifier: idval, type: t, value: val});
                } 
                else {
                    console.log("typeError: Expected Void Type: " + this.sourceString);
                    throw new Error("typeError: Expected Void Type: " + this.sourceString);
                }
            } 
            else {
                console.log("typeError: Unknown Type");
                throw new Error("typeError: Unknown Type");
            };
        },
        ExprStmt(expression, semi) {
            return expression.eval();
        },
        Conditional(e) {
            return e.eval();
        },
        IfStmt(f, lp, expression, rp, statement) {
            if(isTruthy(expression.eval())) {
                if(statement.eval()) {
                    statement.eval().children.forEach(element => {
                        element.eval();
                    });
                }
            }
        },
        IfElseStmt(f, lp, expression, rp, statementf, e, statemente) {
            if(isTruthy(expression.eval())) {
                if(statementf.eval()) {
                    statementf.eval().children.forEach(element => {
                        element.eval();
                    });
                }
            } 
            else {
                if(statemente.eval()) {
                    statemente.eval().children.forEach(element => {
                        element.eval();
                    });
                }
            }
        },
        PutStmt(put, identifier, eq, value, semi) {
            let idv = identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(vMap.get(idv) != undefined) {
                let t = vMap.get(idv).type;
                let val = value.eval();
                if(t == "Bool") {
                    if((val == true || val == false) && !Number.isInteger(val)) {
                        vMap.get(idv).value = val;
                    } 
                    else {
                        console.log("typeError: Expected Bool Type: " + this.sourceString);
                        throw new Error("typeError: Expected Bool Type: " + this.sourceString);
                    }
                } 
                else if (t == "Int") {
                    if(Number.isInteger(val)) {
                        vMap.get(idv).value = val;
                    } 
                    else {
                        console.log("typeError: Expected Int Type: " + this.sourceString);
                        throw new Error("typeError: Expected Int Type: " + this.sourceString);
                    }
                } 
                else if (t == "Char") {
                    if (typeof val === 'string' || val instanceof String) {
                        vMap.get(idv).value = val;
                    }
                    else {
                        console.log("typeError: Expected Char Type: " + this.sourceString);
                        throw new Error("typeError: Expected Char Type: " + this.sourceString);
                    }
                }
                else if (t == "Void") {
                    if(val == null) {
                        vMap.get(idv).value = val;
                    } 
                    else {
                        console.log("typeError: Expected Void Type: " + this.sourceString);
                        throw new Error("typeError: Expected Void Type: " + this.sourceString);
                    }
                } 
                else {
                    console.log("typeError: Unknown Type");
                    throw new Error("typeError: Unknown Type");
                };
            } 
            else {
                console.log("Variable does not exist: " + this.sourceString);
                throw new Error("Variable does not exist: " + this.sourceString);
            }
        },
        WhileStmt(w, lp, disjunction, rp, statement) {
            if(disjunction.sourceString == "TRUE") {
                console.log("While loop condition value cannot equal TRUE")
                throw new Error("While loop condition value cannot equal TRUE")
            }
            if((disjunction.eval() == true || disjunction.eval() == false) && !Number.isInteger(disjunction.eval())) {
                while(disjunction.eval() == true) {
                    if(statement.eval()) {
                        statement.eval().children.forEach(element => {
                            element.eval();
                        });
                    }
                }
            } 
            else {
                console.log("While loop condition must evaluate to type Bool");
                throw new Error("While loop condition must evaluate to type Bool");
            }
        },
        Block(lp, statementList, rp) {
            return statementList.eval();
        },
        StatementList(statements) {
            return statements;
        },
        Expression(e) {
            return e.eval();
        },
        Assignment(e) {
            return e.eval();
        },
        Assignment_Var(identifier, eq, value) {
            let idv = identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(vMap[idv]) {
                let t = vMap[idv].type;
                let val = value.eval();
                if(t == "Bool") {
                    if((val == true || val == false) && !Number.isInteger(val)) {
                        vMap[idv].value = val;
                    } 
                    else {
                        console.log("typeError: Expected Bool Type: " + this.sourceString);
                        throw new Error("typeError: Expected Bool Type: " + this.sourceString);
                    }
                } 
                else if (t == "Int") {
                    if(Number.isInteger(val)) {
                        vMap[idv].value = val;
                    } 
                    else {
                        console.log("typeError: Expected Int Type: " + this.sourceString);
                        throw new Error("typeError: Expected Int Type: " + this.sourceString);
                    }
                } 
                else if( t == "Char") {
                    if(typeof val === 'string' || val instanceof String) {
                        vMap[idv].value = val;
                    }
                    else {
                        console.log("typeError: Expected Char Type: " + this.sourceString);
                        throw new Error("typeError: Expected Char Type: " + this.sourceString);
                    }
                }
                else if (t == "Void") {
                    if(val == null) {
                        vMap[idv].value = val;
                    } 
                    else {
                        console.log("typeError: Expected Void Type: " + this.sourceString);
                        throw new Error("typeError: Expected Void Type: " + this.sourceString);
                    }
                } 
                else {
                    console.log("typeError: Unknown Type");
                    throw new Error("typeError: Unknown Type");
                };
            } 
            else {
                console.log("Variable does not exist: " + this.sourceString);
                throw new Error("Variable does not exist: " + this.sourceString);
            }
        },
        Comment(slash, e, semi) {
            return;
        },
        Disjunction(e) {
            return e.eval();
        },
        Disjunction_Or(termL, and, termR) {
            if((termL.eval() == false || termL.eval() == true) && !Number.isInteger(termL.eval()) && (termR.eval() == false || termR.eval() == true) && !Number.isInteger(termR.eval())) {
                return termL.eval() || termR.eval();
            } 
            else {
                console.log("Invalid Disjunction: " + this.sourceString);
                throw new Error("Invalid Disjunction: " + this.sourceString);
            }
        },
        Conjunction(e) {
            return e.eval();
        },
        Conjunction_And(termL, and, termR) {
            if((termL.eval() == false || termL.eval() == true) && !Number.isInteger(termL.eval()) && (termR.eval() == false || termR.eval() == true) && !Number.isInteger(termR.eval())) {
                return termL.eval() && termR.eval();
            } 
            else {
                console.log("Invalid Conjunction: " + this.sourceString);
                throw new Error("Invalid Conjunction: " + this.sourceString);
            }
        },
        Equality(e) {
            return e.eval();
        },
        Equality_NEQ(termL, neq, termR) {
            let tl: string = "";
            let tr: string = "";
            if(Number.isInteger(termL.eval())) {
                tl = "Int";
            }
            else if(termL.eval() == true || termL.eval == false) {
                tl = "Bool";
            } 
            else if(termL.eval() == null) {
                tl = "Void";
            }
            else if(typeof termL === 'string' || termL instanceof String){
                tl = "Char";
            }
            if(Number.isInteger(termR.eval())) {
                tr = "Int";
            }
            else if(termR.eval() == true || termR.eval() == false) {
                tr = "Bool";
            } 
            else if(termR.eval() == null) {
                tr = "Void";
            }
            else if(typeof termR === 'string' || termR instanceof String){
                tr = "Char";
            }
            if((tl != "" && tr != "") && tl == tr) {
                return termL.eval() != termR.eval();
            } 
            else {
                console.log("Invalid Equality: " + this.sourceString);
                throw new Error("Invalid Equality: " + this.sourceString);
            }
        },
        Equality_EQ(termL, eq, termR) {
            let tl: string = "";
            let tr: string = "";
            if(Number.isInteger(termL.eval())) {
                tl = "Int";
            }
            else if(termL.eval() == true || termL.eval == false) {
                tl = "Bool";
            }
            else if(typeof termL === 'string' || termL instanceof String){
                tl = "Char";
            }
            else if(termL.eval() == null) {
                tl = "Void";
            }
            if(Number.isInteger(termR.eval())) {
                tr = "Int";
            }
            else if(termR.eval() == true || termR.eval() == false) {
                tr = "Bool";
            } 
            else if(typeof termR === 'string' || termR instanceof String){
                tr = "Char";
            }
            else if(termR.eval() == null) {
                tr = "Void";
            }
            if((tl != "" && tr != "") && tl == tr) {
                return termL.eval() == termR.eval();
            } 
            else {
                console.log("Invalid Equality: " + this.sourceString);
                throw new Error("Invalid Equality: " + this.sourceString);
            }
        },
        Comparison(e) {
            return e.eval();
        },
        Comparison_GE(termL, greaterEQ, termR) {
            if(Number.isInteger(termL.eval()) && Number.isInteger(termR.eval())) {
                return termL.eval() >= termR.eval();
            } 
            else {
                console.log("Invalid Comparison: " + this.sourceString);
                throw new Error("Invalid Comparison: " + this.sourceString);
            }
        },
        Comparison_LE(termL, lessEQ, termR) {
            if(Number.isInteger(termL.eval()) && Number.isInteger(termR.eval())) {
                return termL.eval() <= termR.eval();
            } 
            else {
                console.log("Invalid Comparison: " + this.sourceString);
                throw new Error("Invalid Comparison: " + this.sourceString);
            }
        },
        Comparison_G(termL, greater, termR) {
            if(Number.isInteger(termL.eval()) && Number.isInteger(termR.eval())) {
                return termL.eval() > termR.eval();
            } 
            else {
                console.log("Invalid Comparison: " + this.sourceString);
                throw new Error("Invalid Comparison: " + this.sourceString);
            }
        },
        Comparison_L(termL, less, termR) {
            if(Number.isInteger(termL.eval()) && Number.isInteger(termR.eval())) {
                return termL.eval() < termR.eval();
            } 
            else {
                console.log("Invalid Comparison: " + this.sourceString);
                throw new Error("Invalid Comparison: " + this.sourceString);
            }
        },
        Term(e) {
            return e.eval()
        },
        Term_Plus(term, plus, factor) {
            if(Number.isInteger(term.eval()) && Number.isInteger(factor.eval())) {
                return term.eval() + factor.eval();
            } 
            else {
                console.log("Invalid Addition: " + this.sourceString);
                throw new Error("Invalid Addition: " + this.sourceString);
            }
        },
        Term_Minus(term, minus, factor) {
            if(Number.isInteger(term.eval()) && Number.isInteger(factor.eval())) {
                return term.eval() - factor.eval();
            } 
            else {
                console.log("Invalid Subtraction: " + this.sourceString);
                throw new Error("Invalid Subtraction: " + this.sourceString);
            }
        },
        Factor(e) {
            return e.eval();
        },
        Factor_Mult(factor, m, unary) {
            if(Number.isInteger(factor.eval()) && Number.isInteger(unary.eval())) {
                return factor.eval() * unary.eval();
            } 
            else {
                console.log("Invalid Multiplication: " + this.sourceString);
                throw new Error("Invalid Multiplication: " + this.sourceString);
            };
        },
        Factor_Div(factor, d, unary) {
            if(Number.isInteger(factor.eval()) && Number.isInteger(unary.eval())) {
                return factor.eval() / unary.eval();
            } 
            else {
                console.log("Invalid Division: " + this.sourceString);
                throw new Error("Invalid Division: " + this.sourceString);
            };
        },
        Factor_Mod(factor, m, unary) {
            if(Number.isInteger(factor.eval()) && Number.isInteger(unary.eval())) {
                return factor.eval() % unary.eval();
            } 
            else {
                console.log("Invalid Modulo: " + this.sourceString);
                throw new Error("Invalid Modulo: " + this.sourceString);
            };
        },
        Unary(e) {
            return e.eval();
        },
        Unary_Not(not, primary) {
            if((primary.eval() == true || primary.eval() == false) && !Number.isInteger(primary.eval())) {
                return !primary.eval();
            } 
            else {
                console.log(this.sourceString + " is not a bool");
                throw new Error(this.sourceString + " is not a bool");
            }
        },
        Unary_Neg(neg, int) {
            if(Number.isInteger(int.eval())) {
                return int.eval() * -1;
            } 
            else {
                console.log(this.sourceString + " is not an Int");
                throw new Error(this.sourceString + " is not an Int");
            }
        },
        Call(Identifier, open, paramValList, close) {
            let idv = Identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(funcMap[idv]) {
                let fun:func = funcMap[idv];
                let paramValArr = paramValList.eval().children;
                let numParams = fun.varMap.size;
                if(paramValArr.length < numParams) {
                    console.log("Function Call " + this.sourceString + " does not have enough parameters");
                    throw new Error("Function Call " + this.sourceString + " does not have enough parameters");
                } 
                else if (paramValArr.length < numParams) {
                    console.log("Function Call " + this.sourceString + " has too many parameters");
                    throw new Error("Function Call " + this.sourceString + " has too many parameters");
                } 
                else {
                    let i = 0;
                    fun.varMap.forEach(element => {
                        let val = paramValArr[i].eval();
                        let t = element.type;
                        if(t == "Bool") {
                            if((val != true && val != false) || Number.isInteger(val)) {
                                console.log("typeError: Expected Bool Type for parameter " + i + "in " + this.sourceString);
                                throw new Error("typeError: Expected Bool Type for parameter " + i + "in " + this.sourceString);
                            } 
                            else {
                                element.value = val;
                            }
                        } 
                        else if (t == "Int") {
                            if(!Number.isInteger(val)) {
                                console.log("typeError: Expected Int Type for parameter " + i + "in " + this.sourceString);
                                throw new Error("typeError: Expected Int Type for parameter " + i + "in " + this.sourceString);
                            } 
                            else {
                                element.value = val;
                            }
                        } 
                        else if (t == "Char") {
                            if (typeof val !== "string") {
                                console.log("typeError: Expected Char Type for parameter " + i + "in " + this.sourceString);
                                throw new Error("typeError: Expected Char Type for parameter " + i + "in " + this.sourceString);
                            }
                            else {
                                element.value = val;
                            }
                        }
                        else if (t == "Void") {
                            if(val != null) {
                                console.log("typeError: Expected Void Type for parameter " + i + "in " + this.sourceString);
                                throw new Error("typeError: Expected Void Type for parameter " + i + "in " + this.sourceString);
                            } 
                            else {
                                element.value = val;
                            }
                        } 
                        else {
                            console.log("typeError: Unknown Type");
                            throw new Error("typeError: Unknown Type");
                        };
                        i++;
                    });
                    vMap = new Map([...vMap, ...fun.varMap])
                    fun.body.eval();
                    const ret = fun.returnStmt.eval();
                    if(fun.returnType == "Bool") {
                        if(ret != true && ret != false || Number.isInteger(ret)) {
                            console.log("typeError: Expected Bool Type for return " + fun.returnStmt.sourceString);
                            throw new Error("typeError: Expected Bool Type for return " + fun.returnStmt.sourceString);
                        }
                    } 
                    else if (fun.returnType == "Int") {
                        if(!Number.isInteger(ret)) {
                            console.log("typeError: Expected Int Type for return " + fun.returnStmt.sourceString);
                            throw new Error("typeError: Expected Int Type for return " + fun.returnStmt.sourceString);
                        }
                    } 
                    else if (fun.returnType == "Char") {
                        if (typeof ret !== 'string') {
                            console.log("typeError: Expected Char Type for return " + fun.returnStmt.sourceString);
                            throw new Error("typeError: Expected Char Type for return " + fun.returnStmt.sourceString);
                        }
                    }
                    else if (fun.returnType == null) {
                        if(ret != null) {
                            console.log("typeError: Expected Void Type for return " + fun.returnStmt.sourceString);
                            throw new Error("typeError: Expected Void Type for return " + fun.returnStmt.sourceString);
                        }
                    }
                    vMap.forEach(element => {
                        fun.varMap.forEach(e => {
                            if(element.identifier == e.identifier) {
                                vMap.delete(element.identifier);
                            }
                        });
                    });
                    return ret;
                }
            } 
            else {
                console.log("Function " + Identifier.sourceString + " does not exist");
                throw new Error("Function " + Identifier.sourceString + " does not exist");
            }
        },
        ParamValList(pl) {
            return pl;
        },
        ParamVal(e) {
            return e.eval();
        },
        ParamVal_NoComma(val) {
            return val.eval();
        },
        ParamVal_Comma(comma, val) {
            return val.eval();
        },
        Expr(open, exp, close) {
            return exp.eval();
        },
        Type(e) {
            return e.eval();
        },
        Int(num) {
            return Number(num.sourceString);
        },
        Bool(bool) {
            if(bool.sourceString == "TRUE") {
                return true;
            } 
            else if (bool.sourceString == "FALSE") {
                return false;
            }
        },
        Char(openQuote, char, closeQuote) {
            return char.sourceString;
        },
        Void(v) {
            return null;
        },
        Get(e) {
            return e.eval();
        },
        Get_Call(get, call) {
            return call.eval();
        },
        Get_Identifier(get, id) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(vMap.get(idv)) {
                let val: v = vMap.get(idv);
                if(val.type == "Bool") {
                    if((val.value != true && val.value != false) || Number.isInteger(val.value)) {
                        console.log("typeError: Expected Bool Type");
                        throw new Error("typeError: Expected Bool Type");
                    } 
                    else {
                       return val.value;
                    }
                } 
                else if (val.type == "Int") {
                    if(!Number.isInteger(val.value)) {
                        console.log("typeError: Expected Int Type");
                        throw new Error("typeError: Expected Int Type");
                    } 
                    else {
                        return val.value;
                    }
                } 
                else if (val.type == "Char") {
                    if(typeof val.value != 'string') {
                        console.log("typeError: Expected Char Type");
                        throw new Error("typeError: Expected Char Type");
                    }
                    else {
                        return val.value;
                    }
                }
                else if (val.type == "Void") {
                    if(val.value != null) {
                        console.log("typeError: Expected Void Type");
                        throw new Error("typeError: Expected Void Type");
                    } 
                    else {
                        return null;
                    }
                } 
                else {
                    console.log("typeError: Unknown Type");
                    throw new Error("typeError: Unknown Type");
                };
            } 
            else {
                console.log("Referenced " + id.sourceString + " before it was declared");
                throw new Error("Referenced " + id.sourceString + " before it was declared");
            }
        },
        _iter(...e) {
            e.forEach(element => {
                element.eval();
            });
        }
    });

    let ascResult = "";
    semantics.addOperation('toASC', {
        Program(e) {
            e.toASC();
            return ascResult;
        },
        FunDecl(e) {
            return e.toASC();
        },
        FunDecl_Main(main, type, lb, statementList, ret, expression, semi, rb) {
            let retStr = "export function main(): ";
            if(type.sourceString == "Bool") {
                retStr += "bool {\n"; 
            } 
            else if (type.sourceString == "Int") {
                retStr += "i32 {\n";
            } 
            else if (type.sourceString == "Void") {
                retStr += "void {\n";
            }
            else if (type.sourceString == "Char") {
                retStr += "string {\n";
            }
            if(statementList.toASC()) {
                statementList.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            if(type.sourceString != "Void") {
                retStr += "return " + expression.toASC() + ";\n";
            }
            ascResult += retStr + "}\n";
            return retStr;
        },
        FunDecl_NonMain(fun, id, lp, paramList, rp, colon, type, lb, statementList, ret, expression, semi, rb) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            let retStr = "function " + idv + "(";
            if(paramList.toASC()) {
                paramList.toASC().children.forEach(element => {
                    retStr += element.toASC();
                });
            }
            retStr += "): ";
            if(type.sourceString == "Bool") {
                retStr += "bool {\n"; 
            } 
            else if (type.sourceString == "Int") {
                retStr += "i32 {\n";
            } 
            else if (type.sourceString == "Void") {
                retStr += "void {\n";
            }
            else if (type.sourceString == "Char") {
                retStr += "string {\n";
            }
            if(statementList.toASC()) {
                statementList.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            if(type.sourceString != "Void") {
                retStr += "return " + expression.toASC() + ";\n";
            }
            ascResult += retStr + "}\n";
            return retStr;
        },
        ParamList(pl) {
            return pl;
        },
        Param(e) {
            return e.toASC();
        },
        Param_NoComma(id, colon, t) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(t.sourceString == "Bool") {
                return idv + ": bool"; 
            } 
            else if (t.sourceString == "Int") {
                return idv + ": i32";
            }
            else if (t.sourceString == "Char") {
                return idv + ": string";
            }
        },
        Param_Comma(comma, id, colon, t) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(t.sourceString == "Bool") {
                return ", " + idv + ": bool"; 
            } 
            else if (t.sourceString == "Int") {
                return ", " + idv + ": i32";
            }
            else if (t.sourceString == "Char") {
                return ", " + idv + ": string";
            }
        },
        Statement(e) {
            return e.toASC();
        },
        VarDecl(v, id, colon, type, eq, expression, semi) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            if(type.sourceString == "Bool") {
                return "let " + idv + ": bool = " + expression.toASC() + ";\n";
            } 
            else if (type.sourceString == "Int") {
                return "let " + idv + ": i32 = " + expression.toASC() + ";\n";
            }
            else if (type.sourceString == "Char") {
                return "let " + idv + ": string = " + '"' + expression.toASC() + '"' + ";\n";
            }
        },
        ExprStmt(expression, semi) {
            return expression.toASC() + ";\n";
        },
        Conditional(e) {
            return e.toASC();
        },
        IfStmt(f, lp, expression, rp, statement) {
            let retStr = "if(" + expression.toASC() + ") {\n";
            if(statement.toASC()) {
                statement.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            retStr += "}\n";
            return retStr;
        },
        IfElseStmt(f, lp, expression, rp, statementf, e, statemente) {
            let retStr = "if(" + expression.toASC() + ") {\n";
            if(statementf.toASC()) {
                statementf.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            retStr += "} else {\n";
            if(statemente.toASC()) {
                statemente.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            retStr += "}\n";
            return retStr;
        },
        PutStmt(put, identifier, eq, value, semi) {
            let idv = identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            return idv + " = " + value.toASC() + ";\n";
        },
        WhileStmt(w, lp, disjunction, rp, statement) {
            let retStr = "while(" + disjunction.toASC() + ") { \n";
            if(statement.toASC()) {
                statement.toASC().children.forEach(element => {
                    retStr += element.toASC() + "\n";
                });
            }
            retStr += "}\n";
            return retStr;
        },
        Block(lp, statementList, rp) {
            return statementList.toASC();
        },
        StatementList(statements) {
            return statements;
        },
        Expression(e) {
            return e.toASC();
        },
        Assignment(e) {
            return e.toASC();
        },
        Assignment_Var(identifier, eq, value) {
            let idv = identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            return idv + " = " + value.toASC() + ";\n";
        },
        Comment(slash, e, semi) {
            return;
        },
        Disjunction(e) {
            return e.toASC();
        },
        Disjunction_Or(termL, and, termR) {
            return termL.toASC() + " | " + termR.toASC();
        },
        Conjunction(e) {
            return e.toASC();
        },
        Conjunction_And(termL, and, termR) {
            return termL.toASC() + " & " + termR.toASC();
        },
        Equality(e) {
            return e.toASC();
        },
        Equality_NEQ(termL, neq, termR) {
            return termL.toASC() + " != " + termR.toASC();
        },
        Equality_EQ(termL, eq, termR) {
            return termL.toASC() + " == " + termR.toASC();
        },
        Comparison(e) {
            return e.toASC();
        },
        Comparison_GE(termL, greaterEQ, termR) {
            return termL.toASC() + " >= " + termR.toASC();
        },
        Comparison_LE(termL, lessEQ, termR) {
            return termL.toASC() + " <= " + termR.toASC();
        },
        Comparison_G(termL, greater, termR) {
            return termL.toASC() + " > " + termR.toASC();
        },
        Comparison_L(termL, less, termR) {
            return termL.toASC() + " < " + termR.toASC();
        },
        Term(e) {
            return e.toASC()
        },
        Term_Plus(term, plus, factor) {
            return term.toASC() + " + " + factor.toASC();
        },
        Term_Minus(term, minus, factor) {
            return term.toASC() + " - " + factor.toASC();
        },
        Factor(e) {
            return e.toASC();
        },
        Factor_Mult(factor, m, unary) {
            return factor.toASC() + " * " + unary.toASC();
        },
        Factor_Div(factor, d, unary) {
            return factor.toASC() + " / " + unary.toASC();
        },
        Factor_Mod(factor, m, unary) {
            return factor.toASC() + " % " + unary.toASC();
        },
        Unary(e) {
            return e.toASC();
        },
        Unary_Not(not, primary) {
            return "!" + primary.toASC();
        },
        Unary_Neg(neg, int) {
            return "-" + int.toASC();
        },
        Call(Identifier, open, paramValList, close) {
            let idv = Identifier.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            let paramValArr = paramValList.toASC().children;
            let paramVals = "";
            paramValArr.forEach(element => {
                paramVals += element.toASC();
            });
            let retStr = idv + "(" + paramVals + ")";
            return retStr;
        },
        ParamValList(pl) {
            return pl;
        },
        ParamVal(e) {
            return e.toASC();
        },
        ParamVal_NoComma(val) {
            return val.toASC();
        },
        ParamVal_Comma(comma, val) {
            return ", " + val.toASC();
        },
        Expr(open, exp, close) {
            return "(" + exp.toASC() + ")";
        },
        Type(e) {
            return e.sourceString;
        },
        Int(num) {
            return num.sourceString;
        },
        Bool(bool) {
            if(bool.sourceString == "TRUE") {
                return 'true';
            } 
            else if (bool.sourceString == "FALSE") {
                return 'false';
            }
        },
        Char(openQuote, char, closeQuote) {
            return char.sourceString;
        },
        Void(v) {
            return 'void';
        },
        Get(e) {
            return e.toASC();
        },
        Get_Call(get, call) {
            return call.toASC();
        },
        Get_Identifier(get, id) {
            let idv = id.sourceString;
            if(keywords.includes(idv)) {
                idv = idv + "0";
            }
            return idv;
        },
        _iter(...e) {
            e.forEach(element => {
                element.toASC();
            });
        }
    });
