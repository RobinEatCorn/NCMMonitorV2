const sqlite3=require("sqlite3");
const queue=require("./queue");
const queue_db=require("./queue_db");
const fs=require("fs");

var {email,password}=JSON.parse(fs.readFileSync("./account.json"));
var uid;

console.log(`email=${email}`);
console.log(`password=${password}`);

var db;
var qdb;
var q=new queue({Delay:1});

q.on("run",()=>{db=new sqlite3.Database("./test.db");qdb=new queue_db(db)});
q.on("stop",()=>{db.close()});

q.add(
    "http://localhost:3000/login/status",
    checkLoginStatus
);

function checkLoginStatus(data){
    data=JSON.parse(data);
    if(data&&data.code&&data.code==200){
        uid=data.profile.userId;
        console.log(`Already login. uid=${uid}`);
        getPlaylists();
    } else {
        login();
    }
}

function verifyLogin(data){
    data=JSON.parse(data);
    if(data&&data.code&&data.code==200){
        uid=data.profile.userId;
        console.log(`Login successfully. uid=${uid}`);
        return data;
    } else {
        console.error("Login failed");
        return null;
    }
}

function login(){
    console.log("Login...");
    q.add(
        `http://localhost:3000/login?email=${email}&password=${password}`,
        getPlaylists,
        verifyLogin
    );
}

function verifyPlaylists(data){
    data=JSON.parse(data);
    if(data&&data.code&&data.code==200){
        if(data.more==false){
            console.log(`Get ${data.playlist.length} playlists successfully.`);
            return data.playlist;
        } else {
            console.log("More playlists needed.");
            return null;
        }
    } else {
        console.error("Get playlist failed.");
        return null;
    }
}

function getPlaylists(rubbish){
    q.add(
        `http://localhost:3000/user/playlist?uid=${uid}&limit=1000`,
        savePlaylists,
        verifyPlaylists
    );
}

function savePlaylists(playlists){
    db.serialize(()=>{
        db.run("BEGIN TRANSACTION");
        db.parallelize(()=>{
            playlists.forEach(({id,name,coverImgUrl,trackCount,subscribed})=>{
                db.run(
                    "INSERT INTO Playlists(Pid,Name,Subscribed,TrackCount,Avartar) VALUES (?,?,?,?,?)",
                    [id,name,subscribed,trackCount,coverImgUrl]
                )
                console.log(`Writing playlist   ${name}`);
            });
        });
        db.run("COMMIT");
        playlists.forEach(({id})=>{
            getPlaylistDetail(id);
        })
    });

}

function verifyPlaylistDetail(data){
    data=JSON.parse(data);
    if(data&&data.code&&data.code==200){
        return data;
    } else {
        return null;
    }
}

function getPlaylistDetail(id){
    q.add(
        `http://localhost:3000/playlist/detail?id=${id}`,
        getSongs,
        verifyPlaylistDetail
    );
}

function verifySongDetail(data){
    data=JSON.parse(data);
    if(data&&data.code&&data.code==200){
        return data;
    } else {
        return null;
    }
}

function getSongs(data){
    var playlist=data.playlist;
    console.log(`Inspecting ${playlist.name}(${q.len})`);
    var i;
    db.serialize(()=>{
        db.run("BEGIN TRANSACTION");
        db.parallelize(()=>{
            for(i=0;i<playlist.tracks.length;i++){
                var {id,name}=playlist.tracks[i];
                var available=data.privileges[i].cp;
                db.run(
                    "INSERT OR REPLACE INTO Songs (Sid,Name,Available) VALUES (?,?,?)",
                    [id,name,available]
                );
                db.run(
                    "INSERT INTO Belongs (Sid,Pid) VALUES (?,?)",
                    [id,playlist.id]
                );
                console.log(`Writing Song (${id})(${available})${name}(${q.len})`);
            }
            for(;i<playlist.trackIds.length;i++){
                id=playlist.trackIds[i].id;
                db.run(
                    "INSERT INTO Belongs (Sid,Pid) VALUES (?,?)",
                    [id,playlist.id]
                );
                q.add(
                    `http://localhost:3000/song/detail?ids=${id}`,
                    saveSongDetail,
                    verifySongDetail
                );
            }
        });
        db.run("COMMIT");
    });
}

function saveSongDetail(data){
    var song=data.songs[0];
    var available=data.privileges[0].cp;
    var {id,name}=song;
    console.log(`*Writing Song (${id})(${available})${name}(${q.len})(${qdb.len})`);
    qdb.add(
        "INSERT OR REPLACE INTO Songs (Sid,Name,Available) VALUES (?,?,?)",
        [id,name,available]
    );
}