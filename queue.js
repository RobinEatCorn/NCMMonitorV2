const request=require("request").defaults({jar:true});
const eventEmitter=require("events");

function defaultVerify(data){return data;}

class queue extends eventEmitter{
    constructor(options){
        super();
        options=options || {};
        this.defaultLives=options["Lives"] || 5;
        this.defaultDelay=options["Delay"] || 3000;
        this.q=[];
        this.running=false;
    }
    add(url,callback,verify){
        var lives=this.defaultLives;
        verify=verify || defaultVerify;
        this.q.push({url,lives,callback,verify});
        if(!this.running){
            this.running=true;
            this.emit("run");
            this.get();
        }
    }
    get(){
        var {url,lives,callback,verify}=this.q.shift();
        request(url,(err,res,data)=>{
            if(err)throw err;
            var result=verify(data);
            if(result){
                //console.log(`Get ${url}   OK`);
                callback(result);
                if(this.q.length>0){
                    setTimeout(this.get.bind(this),this.defaultDelay);
                } else {
                    this.running=false;
                    this.emit("stop");
                }
            } else {
                lives--;
                //console.log(`Get ${url} failed. lives : ${lives}`);
                if(lives!=0){
                    this.q.push({url,lives,callback,verify});
                    setTimeout(this.get.bind(this),this.defaultDelay);
                } else {
                    console.error(`ERROR: Can't get ${url}`);
                    if(this.q.length>0){
                        setTimeout(this.get.bind(this),this.defaultDelay);
                    } else {
                        this.running=false;
                        this.emit("stop");
                    }
                }
            }
        })
    }
    get len(){
        return this.q.length;
    }
}

module.exports=queue;