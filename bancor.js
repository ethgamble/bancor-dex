"use strict";

// https://github.com/EOSIO/eos/blob/master/contracts/eosio.system/exchange_state.hpp
// https://github.com/EOSIO/eos/blob/master/contracts/eosio.system/exchange_state.cpp

var BigNumber = require('bignumber.js');

var Bancor = function(){
    this.weight = new BigNumber(0.5);
    this.supply = {amount: new BigNumber(100000000000000), symbol: 'RAMCORE'};
    this.base = {balance: {amount:new BigNumber(64 * 1024 * 1024 * 1024), symbol: 'RAM'}, weight: this.weight};
    this.quote = {balance: {amount:new BigNumber(1000000), symbol: 'EOS'}, weight: this.weight};

};

Bancor.prototype = {
    convertToExchange: function(_c, _in){
        var R = this.supply.amount;
        var C = _c.balance.amount.plus(_in.amount);
        var F = _c.weight.div(1000.0);
        var T = _in.amount;
        var ONE = new BigNumber(1);

        var E = new BigNumber(0).minus(R.mul(ONE.minus(new BigNumber(Math.pow(parseFloat((ONE.plus(T.div(C))).toString(10)), parseFloat(F.toString(10))).toFixed(15)))));
        var issued = E;

        this.supply.amount = this.supply.amount.plus(issued);
        if(_c.balance.symbol === this.base.balance.symbol){
            this.base.balance.amount =  this.base.balance.amount.plus(_in.amount);
        } else if(_c.balance.symbol === this.quote.balance.symbol){
            this.quote.balance.amount = this.quote.balance.amount.plus(_in.amount);
        } else {
            throw new Error('Wrong Token Symbol');
        }
        return {amount: issued, symbol: this.supply.symbol};
    },
    convertFromExchange: function(_c, _in){
        if(_in.symbol !== this.supply.symbol){
            throw new Error('unexpected asset symbol input');
        }
        var R = this.supply.amount.minus(_in.amount);
        var C = _c.balance.amount;
        var F = new BigNumber(1000).div(_c.weight);
        var E = _in.amount;
        var ONE = new BigNumber(1);

        var T = C.mul(new BigNumber(Math.pow(parseFloat(ONE.plus(E.div(R)).toString(10)), parseFloat(F)).toFixed(15)).minus(ONE));
        var out = T;

        this.supply.amount = this.supply.amount.minus(_in.amount);
        if(_c.balance.symbol === this.base.balance.symbol){
            this.base.balance.amount =  this.base.balance.amount.minus(out);
        } else if(_c.balance.symbol === this.quote.balance.symbol){
            this.quote.balance.amount = this.quote.balance.amount.minus(out);
        } else {
            throw new Error('Wrong Token Symbol');
        }

        return {amount: out, symbol: _c.balance.symbol};
    },
    convert: function(_from, _to){
        var sellSymbol = _from.symbol;
        var exSymbol = this.supply.symbol;
        var baseSymbol = this.base.balance.symbol;
        var quoteSymbol = this.quote.balance.symbol;
        var from;
        if(sellSymbol !== exSymbol){
            if(sellSymbol === baseSymbol){
                from = this.convertToExchange(this.base, _from);
            } else if(sellSymbol === quoteSymbol){
                from = this.convertToExchange(this.quote, _from);
            } else{
                throw new Error("invalid sell");
            }
        } else{
            if( _to === baseSymbol){
                from = this.convertFromExchange(this.base, _from);
            } else if(_to === quoteSymbol){
                from = this.convertFromExchange(this.quote, _from);
            } else {
                throw new Error("invalid conversion");
            }
        }

        if(from.amount.isNaN()){
            throw new Error("invalid exchange");
        }

        if(_to != from.symbol){
            return this.convert(from, _to);
        }
        return from;
    }
};

var bancor = new Bancor();

console.log('convert 1 EOS to EOS: ', bancor.convert({amount: new BigNumber(1), symbol: 'EOS'}, 'EOS').amount.toString(10), 'EOS');
console.log('convert 1 EOS to RAM: ',bancor.convert({amount: new BigNumber(1), symbol: 'EOS'}, 'RAM').amount.toString(10), 'byte RAM');
console.log('convert 1 byte RAM to EOS: ',bancor.convert({amount: new BigNumber(1), symbol: 'RAM'}, 'EOS').amount.toString(10), 'EOS');
console.log('convert 1 byte RAM to RAM: ',bancor.convert({amount: new BigNumber(1), symbol: 'RAM'}, 'RAM').amount.toString(10), 'byte RAM');
console.log('convert 1 EOS to RAMCORE: ', bancor.convert({amount: new BigNumber(1), symbol: 'EOS'}, 'RAMCORE').amount.toString(10), 'RAMCORE');
console.log('convert 1 RAMCORE to EOS: ',bancor.convert({amount: new BigNumber(1), symbol: 'RAMCORE'}, 'EOS').amount.toString(10), 'EOS');
console.log('convert 1 byte RAM to RAMCORE: ',bancor.convert({amount: new BigNumber(1), symbol: 'RAM'}, 'RAMCORE').amount.toString(10), 'RAMCORE');
console.log('convert 1 RAMCORE to RAM: ',bancor.convert({amount: new BigNumber(1), symbol: 'RAMCORE'}, 'RAM').amount.toString(10), 'byte RAM');

