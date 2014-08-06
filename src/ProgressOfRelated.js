/*globals tau */
tau
    .mashups
    .addDependency('Underscore')
    .addDependency('jQuery')
    .addDependency('tau/configurator')
    .addDependency('tp/request/view')
    .addDependency('ProgressOfRelated/ProgressOfRelated.config')
    .addMashup(function(_, $, configurator, view, mashupConfig) {

        'use strict';

        var store = configurator.getStore();

        configurator.getGlobalBus().once('configurator.ready', function(e, appConfigurator) {
            store = appConfigurator.getStore();
        });

        var Mashup = {

            init: function($el, config) {
                this.$el = $el;
                this.entity = config.entity;

                $.when(this
                    .getConfig(this.entity))
                    .then(function(config) {

                        if (!config) {
                            $el.parent().parent().hide();
                        } else {

                            store.on({
                                type: 'relation',
                                eventName: 'afterRemove',
                                listener: this
                            }, function() {
                                this.load(config);
                            }.bind(this));

                            store.on({
                                type: 'relation',
                                eventName: 'afterSave',
                                listener: this
                            }, function() {
                                this.load(config);
                            }.bind(this));

                            this.load(config);
                        }
                    }.bind(this));

            },

            getConfig: function(entity) {
                var configs = _.where(mashupConfig, {
                    entityType: entity.entityType.name.toLowerCase()
                });

                if (!configs.length) {
                    return null;
                }
                var resultConfig = configs[0];

                if (_.find(configs, function(v) {
                    return v.projectId;
                })) {
                    resultConfig = store
                        .getDef(entity.entityType.name, {
                            id: entity.id,
                            fields: [{
                                'project': ['id']
                            }]
                        })
                        .then(function(res) {
                            var projectId = res.project && res.project.id;

                            var config = _.findWhere(configs, {
                                projectId: projectId
                            });

                            return config;
                        });
                }

                return resultConfig;
            },

            load: function(config) {

                var entity = this.entity;

                var fields = [];

                if (!config.relationTypes.length || config.relationTypes.indexOf('inbound') >= 0) {
                    fields.push({
                        'masterRelations': [{
                            'master': [
                                'id', {
                                    'entityType': ['name']
                                }
                            ]
                        }]
                    });
                }

                if (!config.relationTypes.length || config.relationTypes.indexOf('outbound') >= 0) {
                    fields.push({
                        'slaveRelations': [{
                            'slave': [
                                'id', {
                                    'entityType': ['name']
                                }
                            ]
                        }]
                    });
                }

                return store
                    .getDef(entity.entityType.name, {
                        id: entity.id,
                        fields: fields
                    })
                    .then(function(res) {
                        var entities = [];

                        entities = entities.concat(_.pluck(res.masterRelations ? res.masterRelations : [],
                            'master'));
                        entities = entities.concat(_.pluck(res.slaveRelations ? res.slaveRelations : [],
                            'slave'));

                        if (config.relationEntityTypes && config.relationEntityTypes.length) {
                            entities = _.filter(entities, function(v) {
                                return config.relationEntityTypes.indexOf(v.entityType.name.toLowerCase()) >=
                                    0;
                            });
                        }

                        var ids = _.pluck(entities, 'id');
                        if (!ids.length) {
                            return this.renderEmpty();
                        } else {
                            return this.loadEntities(ids);
                        }

                    }.bind(this));
            },

            renderEmpty: function() {
                var $el = this.$el;
                $el.append(
                    '<span class="ui-additionalinfo__label">No related entities to calculate progress</span>');
            },

            loadEntities: function(ids) {

                var $el = this.$el;

                var assignables = store.getDef('assignable', {
                    fields: [
                        'id',
                        'timeSpent',
                        'timeRemain',
                        'effort', {
                            'project': [{
                                'process': ['id']
                            }]
                        }
                    ],
                    $query: {
                        'id': {
                            $in: ids
                        }
                    }
                });

                var processes = store
                    .getDef('context', {
                        id: 1,
                        fields: [{

                            'processes': [
                                'isDefault',
                                'practices'
                            ]
                        }]
                    })
                    .then(function(res) {

                        var def = _.findWhere(res.processes, {
                            isDefault: true
                        });

                        var processes = _.object(res.processes.map(function(v) {
                            var planning = _.findWhere(v.practices, {
                                name: 'Planning'
                            });
                            return [v.id, planning.effortPoints.toLowerCase()];
                        }));

                        processes[0] = processes[def.id];
                        return processes;
                    });

                return $.when(ids, assignables, processes).then(function(ids, entities, processesData) {

                    entities = _.filter(entities, function(v) {
                        return ids.indexOf(v.id) >= 0;
                    });

                    entities = entities.map(function(v) {
                        var processId = 0;
                        if (v.project) {
                            processId = v.project.process.id;
                        }

                        v.effortPoints = processesData[processId];
                        return v;
                    });

                    var sum = function(entities, field) {
                        return entities.reduce(function(res, val) {
                            return res + val[field];
                        }, 0);
                    };

                    var timeSpent = sum(entities, 'timeSpent');
                    var timeRemain = sum(entities, 'timeRemain');
                    var effortHours = sum(_.where(entities, {
                        effortPoints: 'hour'
                    }), 'effort');

                    var effortPoints = sum(_.where(entities, {
                        effortPoints: 'point'
                    }), 'effort');

                    var progress = Math.round(timeSpent / (timeSpent + timeRemain + 0.000001) * 100);

                    var res = [
                        '<table class="additional-info-table container-table">',
                        '<tr class="ui-additionalinfo_editable_true">',
                        '<td class="ui-additionalinfo__label"><div><span class="ui-label">Spent time</span></div></td>',
                        '<td class="ui-additionalinfo__value">',
                            '<span class="property tau-property"><span class="property-text tau-property__value">',
                            timeSpent, ' h</span></span></div></td>',
                        '</tr>',
                        '<tr class="ui-additionalinfo_editable_true">',
                        '<td class="ui-additionalinfo__label"><div><span class="ui-label">Remaining time</span></div></td>',
                        '<td class="ui-additionalinfo__value"><span class="property tau-property"><span class="property-text tau-property__value">' +
                        timeRemain + ' h</span></span></div></td>',
                        '</tr>',
                        '<tr class="ui-additionalinfo_editable_true">',
                        '<td class="ui-additionalinfo__label"><div><span class="ui-label">Initial estimation</span></div></td>',
                        '<td class="ui-additionalinfo__value"><span class="property tau-property"><span class="property-text tau-property__value">' +
                        effortHours + ' h</span></span>',
                        (effortPoints ? [
                        '<br />',
                        '<span class="property-text tau-property__value">',
                        effortPoints,
                        ' pt</span></span>'] : []),
                        '</div></td>',
                        '</tr>',
                        '<tr class="ui-additionalinfo_editable_true">',
                        '<td class="ui-additionalinfo__label"><div><span class="ui-label">Progress</span></div></td>',
                        '<td class="ui-additionalinfo__value"><span class="property tau-property"><span class="property-text tau-property__value">' +
                        progress + '%</span></span></div></td>',
                        '</tr>',
                        '</table>'
                    ];

                    $el.html(_.flatten(res).join(''));
                });
            }
        };

        view.addBlock('Progress of related', function($el, config) {
            Mashup.init($el, config);
        });

    });
