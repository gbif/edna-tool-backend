import { addReadCounts } from '../converters/biom.js';
import {readXlsxHeaders, getMapFromMatrix, readWorkBookFromFile, toBiom } from "../converters/excel.js"
import { uploadedFilesAndTypes, getMimeFromPath, getFileSize, unzip } from '../validation/files.js'
import {getArrayIntersection} from '../validation/misc.js'
import { readFastaAsMap } from '../util/streamReader.js';
import _ from 'lodash'
import {getCurrentDatasetVersion, readTsvHeaders, getProcessingReport, getMetadata, writeProcessingReport,} from '../util/filesAndDirectories.js'
import {updateStatusOnCurrentStep, beginStep, stepFinished, blastErrors, finishedJobSuccesssFully, finishedJobWithError, writeBiomFormats, consistencyCheckReport} from "./util.js"
import { assignTaxonomy } from '../classifier/index.js';
import config from '../config.js';


const processDataset = async (id, version, userName) => {
    try {
        console.log("XLSX coming in, start worker process")
        let files = await uploadedFilesAndTypes(id, version)
        let processionReport = await getProcessingReport(id, version)
        if(!processionReport){
            processionReport= {id: id, createdBy: userName, createdAt: new Date().toISOString()}
          }
    
        let  xlsx = files.files.find(f => f.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || f?.name?.endsWith('.xlsx'))
        try {

          
        let headers_ = {};
        let sheets_ = {};
    
           const {headers, sheets} = await readXlsxHeaders(id, xlsx?.name, version)
    
           headers_ = headers
           sheets_ = sheets
    
           const xlsxErrors = sheets.reduce((acc, curr) => [...acc, ...(curr?.errors || []).map(e => ({message: e}))],[])
           xlsx.errors = xlsxErrors;
           
    
           const sampeTaxonHeaderIntersection = getArrayIntersection(headers?.sampleHeaders, headers?.taxonHeaders);
    
           if(sampeTaxonHeaderIntersection.filter(e => !!e).length > 0) {
            const plural = sampeTaxonHeaderIntersection.length > 1;
            xlsx.errors.push({file: xlsx.name, message: `The column${plural ? 's':''} ${sampeTaxonHeaderIntersection.join(', ')} ${plural ? 'are' : 'is'} present in both the sample and taxon sheet. Only the value from the sample sheet will be added to the DWC archive.`})
           }
    
           if(sheets_ && xlsx){
            xlsx.sheets = sheets_;
          }
         const report = {...processionReport, ...headers_, unzip: false, files:{...files}};
         await writeProcessingReport(id, version, report)
         finishedJobSuccesssFully('success')
    
        } catch (error) {
          if(typeof error === 'string'){
            xlsx.errors = [{file: xlsx.name, message: error}]
          }
          const report = {...processionReport, ...headers_, unzip: false, files:{...files, format: 'INVALID'}};
          await writeProcessingReport(id, version, report)
    
          console.log(error)
        finishedJobWithError(error?.message)
          
        }
        
    } catch (error) {
        console.log(error)
        finishedJobWithError(error?.message)
    }

  
  
    
}




const id = process.argv[2]
const version = process.argv[3]
const userName = process.argv[4]
processDataset(id, version, userName)

