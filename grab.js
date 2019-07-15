const sqlite3=require("sqlite3");
const queue=require("./queue");
const fs=require("fs");

const DB_FILE="./test.db";
const DB_FILE_ONLINE="./test_online.db"

var {email,password}=JSON.parse(fs.readFileSync("./account.json"));
var uid;

console.log(`email=${email}`);
console.log(`password=${password}`);

var db;
var q=new queue({Delay:1});

db=new sqlite3.Database(DB_FILE);

db.run("BEGIN TRANSACTION");

q.on("run",()=>{});
q.on("stop",()=>{
    compareData();
});

checkGrabTime();

function checkGrabTime(){
    var query=`SELECT COUNT(*) AS CNT FROM GrabTimeLog 
                WHERE GrabDate=Date("now","localtime")`;
    db.get(query,(err,{CNT})=>{
        console.log(`CNT=${CNT}`);
        if(CNT!=0){
            //delete today's data
            console.log("Already grabbed today");
            deleteData();
            //grab again
            //compare
        } else {
            //move and replace data
            console.log("Haven't grabbed today");
            moveData();
            //grab data
            //compare
        }
    });
}

function moveData(){
    db.serialize(()=>{
        //db.run("BEGIN TRANSACTION")
        db.run("DELETE FROM __Playlists")
          .run("DELETE FROM __Songs")
          .run("DELETE FROM __Belongs")
          .run("INSERT INTO __Playlists SELECT * FROM Playlists")
          .run("INSERT INTO __Songs SELECT * FROM Songs")
          .run("INSERT INTO __Belongs SELECT * FROM Belongs",deleteData)
        //  .run("COMMIT",deleteData);
    });
}

function deleteData(){
    db.serialize(()=>{
        //db.run("BEGIN TRANSACTION")
        db.run("DELETE FROM Playlists")
          .run("DELETE FROM Songs")
          .run("DELETE FROM Belongs",grabData)
        //  .run("COMMIT",grabData);
    });
}

function grabData(){
    db.run(`INSERT INTO GrabTimeLog (GrabDate,GrabTime) VALUES 
                (Date("now","localtime"),Time("now","localtime"))`);
    q.add(
        "http://localhost:3000/login/status",
        checkLoginStatus
    );
}

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
        //db.run("BEGIN TRANSACTION");
        db.parallelize(()=>{
            playlists.forEach(({id,name,coverImgUrl,trackCount,subscribed})=>{
                db.run(
                    "INSERT INTO Playlists(Pid,Name,Subscribed,TrackCount,Avartar) VALUES (?,?,?,?,?)",
                    [id,name,subscribed,trackCount,coverImgUrl]
                )
                console.log(`Writing playlist   ${name}`);
            });
        });
        //db.run("COMMIT");
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
        data.privileges.forEach((pr)=>{
            if(!pr.st)return null;
        });
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
        //db.run("BEGIN TRANSACTION");
        db.parallelize(()=>{
            for(i=0;i<playlist.tracks.length;i++){
                var {id,name}=playlist.tracks[i];
                //var available=Boolean(data.privileges[i].cs||data.privileges[i].cp);
                var available=(data.privileges[i].st>=0);
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
            while(i<playlist.trackIds.length){
                var songCnt=0;
                var url="http://localhost:3000/song/detail?ids=";
                var ids="";
                while(i<playlist.trackIds.length&&songCnt<1000){
                    id=playlist.trackIds[i].id;
                    db.run(
                        "INSERT INTO Belongs (Sid,Pid) VALUES (?,?)",
                        [id,playlist.id]
                    );
                    ids=ids+","+id;
                    i++;songCnt++;
                }
                url+=ids.substr(1);
                q.add(
                    url,
                    saveSongDetail,
                    verifySongDetail
                );
            }
        });
        //db.run("COMMIT");
    });
}

function saveSongDetail(data){
    db.serialize(()=>{
        //db.run("BEGIN TRANSACTION");
        if(data.songs.length!=data.privileges.length){
            console.log(`songs:${data.songs.length},privis:${data.privileges.length}`);
            console.log(data.songs);
            console.log(data.privileges);
        }
        for(let i=0;i<data.songs.length;i++){
            var song=data.songs[i];
            try{
                var available=(data.privileges[i].st>=0);
            } catch {
                console.log(data.privileges[i]);
                console.log(i);
                throw Error("No st");
            }
            var {id,name}=song;
            console.log(`*Writing Song (${id})(${available})${name}(${q.len})`);
            db.run(
                "INSERT OR REPLACE INTO Songs (Sid,Name,Available) VALUES (?,?,?)",
                [id,name,available]
            );
        }
        //db.run("COMMIT");
    });
}

function compareData(){
    db.run("COMMIT");
    fs.readFile("./compare.sql",{encoding:"utf8"},(err,data)=>{
        if(err)throw err;
        db.exec(data,(err)=>{
            if(err)throw err;
            fs.copyFile(DB_FILE,DB_FILE_ONLINE,(err)=>{
                if(err)throw err;
            })
        });
    });
}