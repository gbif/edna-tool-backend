import { getProcessingReport, writeProcessingReport, getMetadata, getCurrentDatasetVersion, readBiom, zipDwcArchive, rsyncToPublicAccess, dwcArchiveExists} from '../util/filesAndDirectories.js'
import {registerDatasetInGBIF} from '../util/gbifRegistry.js'
import { biomToDwc } from '../converters/dwc.js';
import {getMimeFromPath, getFileSize} from '../validation/files.js'
import config from '../config.js'
import auth from './Auth/auth.js';
import queue from 'async/queue.js';

const runningJobs = new Map();

const STEPS = {
    "readBiom": {
        "name": "readBiom",
        "status": "pending",
        "message": "Reading BIOM",
        "messagePending": "Read BIOM"
      },
      "writeDwc": {
        "name": "writeDwc",
        "status": "pending",
        "message": "Writing DWC",
        "messagePending": "Write DWC"
      },
      "zipArchive": {
        "name": "zipArchive",
        "status": "pending",
        "message": "Zipping files",
        "messagePending": "Zip files"
      },

}

 const q = queue(async (options) => {
    const {id, version} = options;
    console.log("Options "+ JSON.stringify(options) )
    let job = runningJobs.get(id);
    job.summary = {};
    try {
        job.version = version;
        job.steps = job.steps.filter(j => j.status !== 'queued');
        job.steps.push({...STEPS.readBiom, status: 'processing', time: Date.now() })
        runningJobs.set(id, job);
        console.log("Read Biom")

        const biom = await readBiom(id, version)
        job.steps[job.steps.length -1] = {...job.steps[job.steps.length -1], status: 'finished'}
        job.steps.push({...STEPS.writeDwc, status: 'processing', time: Date.now() })

        runningJobs.set(id, job);
        console.log("Write Dwc")
        await biomToDwc(biom, undefined, `${config.dataStorage}${id}/${version}`)
        console.log("Dwc written")
        job.steps[job.steps.length -1] = {...job.steps[job.steps.length -1], status: 'finished'}
        job.steps.push({...STEPS.zipArchive, status: 'processing', time: Date.now() })
        runningJobs.set(id, job);
        await zipDwcArchive(id, version)
        console.log("Archive zipped")
        job.steps[job.steps.length -1] = {...job.steps[job.steps.length -1], status: 'finished'}

       /* job.steps.push({ status: 'processing', message: 'Copying archive to public URI', time: Date.now() })
        runningJobs.set(id, job);
         console.log("Archive copied to public access url")
        await rsyncToPublicAccess(id, version)
        job.steps.push({ status: 'processing', message: 'Registering dataset in GBIF', time: Date.now() })
        runningJobs.set(id, job);
        const gbifDatasetKey = await registerDatasetInGBIF(id, config.gbifUsername, config.gbifPassword)
        job.gbifDatasetKey = gbifDatasetKey;
        runningJobs.set(id, job);
        console.log("Dataset registered in GBIF, crawl triggered") */
    } catch (error) {
        console.log(error)
        
       throw error
    }

}, 3)

const pushJob = async (id, version) => {
    runningJobs.set(id, { id: id, version, steps: [{ status: 'queued', time: Date.now() }] })
    try {
       
        q.push({ id: id, version }, async (error, result) => {
            if (error) {
                console.log(error);
                let job = runningJobs.get(id);
                job.steps.push({ status: 'failed', message: error?.message, time: Date.now() })
                runningJobs.delete(id)
                //runningJobs.set(id, {...runningJobs.get(id), status: 'failed'} )
               // throw error
            } else {
                let job = runningJobs.get(id);
                job.steps.push({ status: 'finished', time: Date.now() })
                let report = await getProcessingReport(id, version);
                let file = {
                    fileName:'archive.zip',
                    format: "DWC", fileName:'archive.zip',
                    size: getFileSize(`${config.dataStorage}${id}/${version}/archive.zip`), 
                    mimeType: 'application/zip'
                }
                report.filesAvailable = report.filesAvailable ?    [...report.filesAvailable, file] :[file]
                report.dwc = job;
                await writeProcessingReport(id, version, report)
                runningJobs.delete(id)
            }
        })
    } catch (error) {
        console.log(error)
        throw error
    }
} 

const processDwc = async function (req, res) {

    console.log("processDwc")
    if (!req.params.id) {
      res.sendStatus(400);
    } else {
        try {
            let version = req?.query?.version;
            if(!version){
                version = await getCurrentDatasetVersion(req.params.id)
            } 
            console.log("Version "+version)
           
                if(!runningJobs.has(req.params.id, version)){
                    console.log("Push job")
                    pushJob(req.params.id, version );
                    res.sendStatus(201)
                } else {
                    res.sendStatus(302)
                }
                     
           
           // console.log(eml)
           // res.sendStatus(201)
        } catch (error) {
            console.log(error)
            res.sendStatus(500)
        }
    }
  };

  const publishDwc = async function (req, res) {

    console.log("publishDwc")
    if (!req.params.id) {
      res.sendStatus(400);
    } else {
        try {
            let version = req?.query?.version;
            if(!version){
                version = await getCurrentDatasetVersion(req.params.id)
            } 
            const hasDwcArchive = await  dwcArchiveExists(req.params.id, version)
            
            
            let report = await getProcessingReport(req.params.id, version);
            report.publishing = {steps : []}
            console.log("Copying Archive to public access URI")
            report.publishing.steps.push({ status: 'processing', message: 'Copying archive to public URI', time: Date.now() })

            await rsyncToPublicAccess(req.params.id, version)
            report.publishing.steps.push({ status: 'processing', message: 'Registering dataset in GBIF', time: Date.now() })

            const gbifDatasetKey = await registerDatasetInGBIF(req.params.id, config.gbifUsername, config.gbifPassword)
            report.publishing.gbifDatasetKey = gbifDatasetKey;
            console.log("Dataset registered in GBIF, crawl triggered")
            report.publishing.steps.push({ status: 'finished', message: 'Registering dataset in GBIF complete', time: Date.now() })
            await writeProcessingReport(req.params.id, version, report)
            const metadata = await getMetadata(req.params.id, version)
                if(report){
                    if(!!metadata){
                        report.metadata = metadata
                    }
                    res.json(report)
                } else {
                    res.sendStatus(404)
                }
        } catch (error) {
            if(error === "DwC archive does not exist"){
                res.status(400);
            }
            console.log(error)
            res.sendStatus(500)
        }
    }
  };

  const addPendingSteps = job => {
    const steps_ = job.steps;
    
    //console.log(Object.keys(STEPS).filter(s =>  !job.steps.map(a => a?.name).includes(s)).map(k => STEPS[k]));
    return [...steps_, ...Object.keys(STEPS).filter(s => !steps_.map(a => a?.name).includes(s)).map(k => STEPS[k])]
}

export default  (app) => {
    app.post("/dataset/:id/dwc", auth.userCanModifyDataset(), processDwc);

    app.post("/dataset/:id/register-in-gbif", auth.userCanModifyDataset(), publishDwc);

    app.get("/dataset/:id/dwc/:version?", async (req, res) => {
        if (!req.params.id) {
            res.sendStatus(404);
        } else {

            // this will only find jobs that are being processed -will need
            const job = runningJobs.get(req.params.id);

            try {
                let version = req.params?.version;
                if(!version){
                    version = await getCurrentDatasetVersion(req.params.id);
                } 
                let report = await getProcessingReport(req.params.id, version);
                const metadata = await getMetadata(req.params.id, version)

                if(!!metadata){
                    report.metadata = metadata
                }
                if (job) {
                   
                    let dwc = {...job, steps: addPendingSteps(job)};
                    res.json({...report, dwc: dwc});
                } else {     
                if(report){
                    
                    res.json(report)
                } else {
                    res.sendStatus(404)
                }
            }
            } catch (error) {
                console.log(error)
                res.sendStatus(404)
            }
            

        }
    })



}