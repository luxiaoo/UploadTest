const http = require("http");
const fse = require("fs-extra");
const path = require("path");
const multiparty = require("multiparty");


const server = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, "..", "target")


const resolvePost = req => {
    new Promise(resolve => {
        let chunk = "";
        req.on("data", data => {
            chunk += data;
        });

        req.on("end", () => {
            resolve(JSON.parse(chunk));
        });

    })
}

const mergeFileChunk = async (filePath, filename) => {
    const chunkDir = `${UPLOAD_DIR}/${filename}`;
    const chunkPaths = await fse.readdir(chunkDir);
    await fse.writeFile(filePath, "");
    chunkPaths.forEach(chunkPath => {
        fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
        fse.unlinkSync(`${chunkDir}/${chunkPath}`);
    });
    fse.rmdirSync(chunkDir);

}

server.on("request", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
        res.status = 200;
        res.end();
        return;
    }

    const multipart = new multiparty.Form();

    multipart.parse(req, async (err, fileds, files) => {
        if(err){
            return;
        }

        const [chunk] = files.chunk;
        const [hash] = fileds.hash;
        const [filename] = fileds.filename;
        const chunkDir = `${UPLOAD_DIR}/${filename}` ;

        if(!fse.existsSync(chunkDir)){
            await fse.mkdirs(chunkDir);
        }


        await fse.move(chunk.path, `${chunkDir}/${hash}`);

        res.end("received file chunk");
        console.log(req.url)
        
        if (req.url === "/merge") {
            const data =  resolvePost(req);
            const {filename} = data;
            const filePath = `${UPLOAD_DIR}/${filename}`;
            console.log(filePath);
             mergeFileChunk(filePath, filename);
            res.end(
                JSON.stringify({
                    code: 0,
                    message: "file merage success"
                })
            )
        }
    });
})







server.listen(3000, () => console.log("正在监听3000端口"))