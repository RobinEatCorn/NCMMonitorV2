const http=require("http");
const sqlite3=require("sqlite3");
const url=require("url");
const qs=require("querystring");
const fs=require("fs");
const path=require("path");

var DB_FILE_ONLINE;
var CFG_FILE=path.resolve(__dirname,"./config.json");
var IDX_FILE;
var db;

fs.access(CFG_FILE,fs.constants.R_OK,(err)=>{
    if(err){
        throw Error("需要config.json文件，当前文件不存在或不可读取。该文件可通过修改config_template.json获得。");
    } else {
        var data=JSON.parse(fs.readFileSync(CFG_FILE));
        DB_FILE_ONLINE=data["DB_FILE_ONLINE"];
        IDX_FILE=data["IDX_FILE"];
        if(!DB_FILE_ONLINE){throw Error(`config.json文件中缺少"DB_FILE_ONLINE"关键字。`);}
        if(!IDX_FILE){throw Error(`config.json文件中缺少"IDX_FILE"关键字。`);}
        DB_FILE_ONLINE=path.resolve(__dirname,DB_FILE_ONLINE);
        IDX_FILE=path.resolve(__dirname,IDX_FILE);
        db=new sqlite3.Database(DB_FILE_ONLINE);
    }
});

//const DB_ONLINE_FILE=`${__dirname}\\test_online.db`;

function handleData(req,res,reqURL,queries){
    var queryDate=queries.date;
    var returnData={};
    db.all(
        `SELECT 
            Playlists_Changes.ChangeDate AS ChangeDate,
            Playlists_Changes.ChangeType AS ChangeType,
            Playlists_Changes.OldName AS OldName,
            Playlists_Changes.NewName AS NewName,
            Playlists_Changes.Pid AS Pid,
            Playlists_Changes.SongsAdded AS SongsAdded,
            Playlists_Changes.SongsDeleted AS SongsDeleted,
            All_Playlists.Subscribed AS Subscribed
        FROM Playlists_Changes INNER JOIN All_Playlists
            ON Playlists_Changes.Pid=All_Playlists.Pid
        WHERE ChangeDate=?`,
        [queryDate],
        (err,rows)=>{
            if(err)throw err;
            returnData.Playlists_Changes=rows;
            db.all(
                `SELECT 
                    Belongs_Changes.ChangeDate AS ChangeDate,
                    Belongs_Changes.ChangeType AS ChangeType,
                    Belongs_Changes.Sid AS Sid,
                    Belongs_Changes.Pid AS Pid,
                    All_Songs.Name AS Name,
                    All_Songs.Available AS Available
                FROM Belongs_Changes 
                INNER JOIN All_Songs ON Belongs_Changes.Sid=All_Songs.Sid
                WHERE ChangeDate=?`,
                [queryDate],
                (err,rows)=>{
                    if(err)throw err;
                    returnData.Belongs_Changes=rows;
                    db.all(
                        `SELECT 
                            Songs_Changes.ChangeDate AS ChangeDate,
                            Songs_Changes.ChangeType AS ChangeType,
                            Songs_Changes.Sid AS Sid,
                            Songs_Changes.OldAvailable AS OldAvailable,
                            Songs_Changes.NewAvailable AS NewAvailable,
                            Songs_Changes.OldName AS OldName,
                            Songs_Changes.NewName AS NewName,
                            Playlists.Pid AS Pid
                        FROM Songs_Changes INNER JOIN Playlists ON 
                            EXISTS (
                                SELECT * FROM Belongs
                                WHERE Belongs.Pid=Playlists.Pid
                                    AND Belongs.Sid=Songs_Changes.Sid
                            )
                        WHERE ChangeType="CHG" AND ChangeDate=?`,
                        [queryDate],
                        (err,rows)=>{
                            returnData.Songs_Changes=rows;
                            var sendBuffer=Buffer.from(JSON.stringify(returnData));
                            res.setHeader("Content-Length",sendBuffer.length);
                            res.writeHead(200);
                            res.end(sendBuffer);
                    });
                });
        });
}

function handleMainPage(req,res){
    fs.readFile(IDX_FILE,(err,data)=>{
        if(err)throw err;
        res.setHeader("Content-Type","text/html; charset=utf-8");
        res.setHeader("Content-Length",data.length);
        res.writeHead(200);
        res.end(data);
    });
}

function handleRequest(req,res){
    var reqURL=url.parse(req.url);
    var queries=qs.parse(reqURL.query);
    var pathname=reqURL.pathname;
    pathname=pathname.split("/");
    switch(pathname[2]){
        case "data":
            res.setHeader("Content-Type","application/json; charset=utf-8");
            handleData(req,res,reqURL,queries);
            break;
        default:
            handleMainPage(req,res);
            break;
    }
}

module.exports=handleRequest;

//var srv=http.createServer(handleRequest);
//srv.listen(80);