const STEPS = {
    "validating": {
        "name": "validating",
        "status": "pending",
        "message": "Validating files",
        "messagePending": "Validate files"
    },
    "extractArchive": {
        "name": "extractArchive",
        "status": 'pending',
        "message": 'Extracting archive',
        "messagePending": "Extract archive"
    },
    "convertToBiom": {
        "name": "convertToBiom",
        "status": "pending",
        "message": 'Converting to BIOM format',
        "messagePending": "Convert to BIOM format"
    },
    "addReadCounts": {
        "name": "addReadCounts",
        "status": "pending",
        "message": "Adding total read counts pr sample",
        "messagePending": "Add total read counts pr sample"
    },

    "writeBiom1": {
        "name": "writeBiom1",
        "status": "pending",
        "message": "Writing BIOM 1.0",
        "messagePending": "Write BIOM 1.0"
    },
    "writeBiom2": {
        "name": "writeBiom2",
        "status": "pending",
        "message": "Writing BIOM 2.1",
        "messagePending": "Write BIOM 2.1"
    }
}

export default STEPS;