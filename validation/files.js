import fs from 'fs'
import config from '../config.js'
import {execSync, exec}  from 'child_process';

// there may be hidden 'application/octet-stream' files when unzipping an excel workbook
const mimeTypesToBeRemoved = ['application/zip', 'application/octet-stream']

export const getMimeFromPath = (filePath) => {
    const mimeType = execSync('file --mime-type -b "' + filePath + '"').toString();
    return mimeType.trim();
}

const zip = (id) => {
    return new Promise((resolve, reject) => {
      exec(
        `zip -r ${config.outputPath}/${id}/${id}.zip *`,
        {
          cwd: `${config.dataStorage}${id}`,
        },
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  };

export const unzip = async (id, fileName, version = 1) => {
    return new Promise((resolve, reject) => {
        try {
             execSync(`unzip -j -o "${config.dataStorage}${id}/${version}/original/${fileName}" -d "${config.dataStorage}${id}/${version}/original"`);
             resolve()
        } catch (error) {
            reject(error)
        }

    })
}

const deleteFile = async (id, fileName, version = 1) => {
    return new Promise((resolve, reject) => {
        try {
             execSync(`rm "${config.dataStorage}${id}/${version}/original/${fileName}"`);
             resolve()
        } catch (error) {
            reject(error)
        }

    })
}

export const cleanUploadFromZipAndOctetStream = async (id, version = 1) => {
        try {
            let fileList = await fs.promises.readdir(`${config.dataStorage}${id}/${version}/original`);
            for (const f of fileList) {
                const mimeType = getMimeFromPath(`${config.dataStorage}${id}/${version}/original/${f}`)
                if(mimeTypesToBeRemoved.indexOf(mimeType) > -1){
                    console.log(`Deleting ${f}`)
                    await deleteFile(id, f)
                }
            }
        } catch (error) {
            console.log(`Error in cleanUploadFromZipAndOctetStream`)
            throw error
        }
}


const unzipIfNeeded = async (id, version = 1) => {
    try {
     let fileList = await fs.promises.readdir(`${config.dataStorage}${id}/${version}/original`)
     if(fileList.length === 1 && getMimeFromPath(`${config.dataStorage}${id}/${version}/original/${fileList[0]}`) === 'application/zip'){
        await unzip(id, fileList[0])
        await cleanUploadFromZipAndOctetStream(id)
    }
    } catch (error) {
        throw error
    }   
}

const determineFormat = (files) => {
    // If we store a mapping json in the same directory this function will not work.
    if(files.length === 1 && files[0].mimeType === 'application/x-hdf5'){
        return 'BIOM_2_1'
    } else if(files.length === 1 && files[0].mimeType === 'application/json'){
        return 'BIOM_1'
    } else if(files.length === 1 && files[0].mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
        return 'XLSX'
    } else if(files.length === 3){
        return 'TSV_3_FILE'
    } else if(files.length === 2){
        return 'TSV_2_FILE'
    } else {
        console.log('Unsupported format')
        console.log(JSON.stringify(files))
        return 'UNSUPPORTED_FORMAT'
    }
}

export const getFileSize = file => {
    const {size} = fs.statSync(file);
    return size / (1024 * 1000)
}

export const uploadedFilesAndTypes = async (id, version = 1) => {
 
    try {
        await unzipIfNeeded(id)
        const fileList = await fs.promises.readdir(`${config.dataStorage}${id}/${version}/original`)
        const files = fileList.map(f => ({
            mimeType: getMimeFromPath(`${config.dataStorage}${id}/${version}/original/${f}`),
            name: f,
            size: getFileSize(`${config.dataStorage}${id}/${version}/original/${f}`)
        }))
        //console.log(JSON.stringify(files))

        const format = determineFormat(files);
        return {
            format,
            files
        }
    } catch (error) {
        console.log(error)
        return error;
    }

}