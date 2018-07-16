"use strict";

var BigNumber = require('bignumber.js');


var Bancor = function(){
    this.weight = new BigNumber(0.5);
    this.supply = {amount: new BigNumber(100000000000000), symbol: 'RAMCORE'};
    this.base = {balance: {amount:new BigNumber(64 * 1024 * 1024 * 1024), symbol: 'RAM'}, weight: this.weight};
    this.quote = {balance: {amount:new BigNumber(1000000), symbol: 'EOS'}, weight: this.weight};

};

Bancor.prototype = {
    //real_type R(supply.amount);
    //real_type C(c.balance.amount + in.amount);
    //real_type F(c.weight/1000.0);
    //real_type T(in.amount);
    //real_type ONE(1.0);
    //
    //real_type E = -R * (ONE - std::pow( ONE + T / C, F) );
    ////print( "E: ", E, "\n");
    //int64_t issued = int64_t(E);
    //
    //supply.amount += issued;
    //c.balance.amount += in.amount;
    //
    //return asset( issued, supply.symbol );
    convertToExchange: function(_c, _in){
        var R = this.supply.amount;
        var C = _c.balance.amount.plus(_in.amount);
        var F = _c.weight.div(1000.0);
        var T = _in.amount;
        var ONE = new BigNumber(1);

        //console.log(R.toString(10));
        //console.log(C.toString(10));
        //console.log(F.toString(10));
        //console.log(T.toString(10));
        //console.log(ONE.toString(10));

        //E = -R * (ONE - std::pow( ONE + T / C, F) );
        //var E = new BigNumber(0).minus(R.mul(ONE.minus((ONE.plus(T.div(C)))).pow(F)));
        var E = new BigNumber(0).minus(R.mul(ONE.minus(new BigNumber(Math.pow(parseFloat((ONE.plus(T.div(C))).toString(10)), parseFloat(F.toString(10))).toFixed(15)))));
        var issued = E;

        //console.log(issued.toString(10));

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

    //eosio_assert( in.symbol== supply.symbol, "unexpected asset symbol input" );

    //real_type R(supply.amount - in.amount);
    //real_type C(c.balance.amount);
    //real_type F(1000.0/c.weight);
    //real_type E(in.amount);
    //real_type ONE(1.0);
    //
    //
    //// potentially more accurate:
    //// The functions std::expm1 and std::log1p are useful for financial calculations, for example,
    //// when calculating small daily interest rates: (1+x)n
    //// -1 can be expressed as std::expm1(n * std::log1p(x)).
    //// real_type T = C * std::expm1( F * std::log1p(E/R) );
    //
    //real_type T = C * (std::pow( ONE + E/R, F) - ONE);
    ////print( "T: ", T, "\n");
    //int64_t out = int64_t(T);
    //
    //supply.amount -= in.amount;
    //c.balance.amount -= out;
    //
    //return asset( out, c.balance.symbol );
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

    //auto sell_symbol  = from.symbol;
    //auto ex_symbol    = supply.symbol;
    //auto base_symbol  = base.balance.symbol;
    //auto quote_symbol = quote.balance.symbol;
    //
    ////print( "From: ", from, " TO ", asset( 0,to), "\n" );
    ////print( "base: ", base_symbol, "\n" );
    ////print( "quote: ", quote_symbol, "\n" );
    ////print( "ex: ", supply.symbol, "\n" );
    //
    //if( sell_symbol != ex_symbol ) {
    //    if( sell_symbol == base_symbol ) {
    //        from = convert_to_exchange( base, from );
    //    } else if( sell_symbol == quote_symbol ) {
    //        from = convert_to_exchange( quote, from );
    //    } else {
    //        eosio_assert( false, "invalid sell" );
    //    }
    //} else {
    //    if( to == base_symbol ) {
    //        from = convert_from_exchange( base, from );
    //    } else if( to == quote_symbol ) {
    //        from = convert_from_exchange( quote, from );
    //    } else {
    //        eosio_assert( false, "invalid conversion" );
    //    }
    //}
    //
    //if( to != from.symbol )
    //    return convert( from, to );
    //
    //return from;
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



        if(_to != from.symbol){
            return this.convert(from, _to);
        }

        return from;
    }
};

var bancor = new Bancor();

console.log('convert 1 EOS to EOS', bancor.convert({amount: new BigNumber(1), symbol: 'EOS'}, 'EOS').amount.toString(10), 'EOS');
console.log('convert 1 EOS to RAM(byte)',bancor.convert({amount: new BigNumber(1), symbol: 'EOS'}, 'RAM').amount.toString(10), 'RAM');
console.log('convert 1 RAM(byte) to EOS',bancor.convert({amount: new BigNumber(1), symbol: 'RAM'}, 'EOS').amount.toString(10), 'EOS');
console.log('convert 1 RAM(byte) to RAM(byte)',bancor.convert({amount: new BigNumber(1), symbol: 'RAM'}, 'RAM').amount.toString(10), 'RAM');