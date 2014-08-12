tau
    .mashups
    .addDependency('Underscore')
    .addModule('ProgressOfRelated/ProgressOfRelated.config', function(_) {

        var config = [{
            entityType: 'request', //  which page of entity mashup will be shown on
            projectId: 2, // entity should belong this project, can be array, leave empty to skip check
            // relationEntityTypes: ['bug', 'userstory'], // which entity types should be calculated, leave empty to calculate all
            // relationTypes: ['outbound', 'inbound'] // which types of relations should be calculated, leave empty to calculate all
        }];

        config = config.map(function(v) {

            if (!v.entityType) {
                v.entityType = 'request';
            }

            v.projectId = _.compact([].concat(v.projectId));
            v.relationEntityTypes = _.toArray(v.relationEntityTypes);
            v.relationTypes = _.toArray(v.relationTypes);

            return v;
        });

        return config;
    });
