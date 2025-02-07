const fs = require('fs')
const path = require('path')
const parse = require('front-matter')
const glob = require("glob")
const execSync = require('child_process').execSync

const checkField = (field, min, max, re) => {
  if (!field) return false
  field = `${field}`
  if (typeof field !== "string") return false
  if (field.length < min) return false
  if (field.length > max) return false
  if (re && !field.match(re)) return false

  return true
}

glob('_data/**/*.md', null, (er, files) => {
  var contents = []
  var exts = {}

  files.forEach((file) => {
    const data = fs.readFileSync(file, 'utf8')
    const dirname = path.dirname(file)
    const folder = path.basename(dirname)

    if (!path.basename(file).match(/^[a-z0-9\_\-]+\.md$/i)) console.log(`Invalid file name: ${file}`)
    const fileStats = fs.lstatSync(file)
    if (!fileStats.isFile()) console.log(`File is not a file: ${file}`)
    if (fileStats.isSymbolicLink()) console.log(`File is a symbolic link: ${file}`)
    if (fileStats.mode !== 33188) {
      console.log(`File mode is: ${file} ${fileStats.mode}`)
      fs.chmodSync(file, "644")
    }

    var content = parse(data)
    var atts = content.attributes
    atts["folder"] = folder

    if (!checkField(atts["github_user"], 1, 100, /^[A-Za-z0-9\_\-]+$/)) console.log(`${folder}: Invalid github_user: ${atts["github_user"]}`)
    if (!checkField(atts["branch"], 1, 58)) console.log(`${folder}: Invalid branch: ${atts["branch"]}`)
    if (!checkField(atts["profile_pic"], 1, 100, /^[a-z0-9\_\-]+(\.png|\.jpg|\.jpeg|\.gif)$/i)) console.log(`${folder}: Invalid profile_pic: ${atts["profile_pic"]}`)
    if (!checkField(atts["quote"], 1, 100)) console.log(`${folder}: Invalid quote: ${atts["quote"]}`)
    if (!checkField(atts["name"], 1, 28)) console.log(`${folder}: Invalid name: ${atts["name"]}`)
    if (!checkField(atts["folder"], 1, 100, /^[A-Za-z0-9\_\-]+$/)) console.log(`${folder}: Invalid folder: ${atts["folder"]}`)

    const filesInDir = execSync(`ls ${dirname}`, { encoding: 'utf-8' }).trim().split(/\n/)
    const nonMdFilesInDir = filesInDir.filter(entry => { return !entry.match(/\.md$/i) })
    if (nonMdFilesInDir.length > 1) {
      console.log(`Too many image files in folder: ${imagePath}`)
    }
    if (nonMdFilesInDir.length === 1 && nonMdFilesInDir[0] !== atts["profile_pic"]) {
      atts["profile_pic"] = nonMdFilesInDir[0]
    }

    const imagePath = `${dirname}/${atts["profile_pic"]}`
    exts[path.extname(imagePath)] = 1
    const imageExists = fs.existsSync(imagePath)
    if (!imageExists) {
      console.log("Image does not exist: " + imagePath)
    }
    const imageStats = fs.lstatSync(imagePath)
    if (!imageStats.isFile()) console.log(`Image is not a file: ${imagePath}`)
    if (imageStats.isSymbolicLink()) console.log(`File is a symbolic link: ${imagePath}`)
    if (imageStats.mode !== 33188) {
      console.log(`File mode is: ${imagePath} ${imageStats.mode}`) // 33188 == 644
      fs.chmodSync(imagePath, "644")
    }

    const imageSize = execSync(`identify ${imagePath}`, { encoding: 'utf-8' })
    if (!('' + imageSize).match(/544x544/)) {
      try {
        console.log(`Resizing ${imageSize}`)
        const mogrify = execSync(`mogrify -resize "544x544^" -gravity center -extent "544x544" ${imagePath}`, { encoding: 'utf-8' });
        console.log(mogrify)
      } catch (e) {
        // ignore
      }
    }

    contents.push(atts)
  })

  console.log(contents.length)
  console.log(JSON.stringify(exts))
  console.log("Writing yearbook.json")
  fs.writeFileSync("./yearbook.json", JSON.stringify(contents))
  console.log("📚 Done!")
})