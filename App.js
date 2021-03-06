
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: { type: 'hbox'},
    defaults: { padding: 10 },
    items: [ {
        xtype: 'container',
        itemId: 'line_by_line_example',
        flex: 1
    }],
    
    launch: function() {
        var dayAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -1); // get stuff that changed within last 24 house
        this._dateString = Rally.util.DateTime.toIsoString(dayAgo, true);
        var boundGetSomeWorkItems = Ext.bind( this._getSomeWorkItems, this);
        var me = this;
        
        // The async map allows the the stores to be populated concurrently, then call 
        // _prepareLineByGrid for each store when it is done. Get's past the messy asynchronos structuring
        async.map(['Defect','User Story', 'Test Case', 'Task'], boundGetSomeWorkItems, function(err, results){
            var records = results[0].concat(results[1]).concat(results[2]).concat(results[3]);
            me._prepareLineByLineGrid(records);
        });
    },

    // This fn is called once for each type in the async map    
    _getSomeWorkItems: function(workItemType,callback) {
        //console.log("WorkItemType", workItemType);
        if (this.line_grid) {
            this.line_grid.destroy();
        }
        console.log("getting "+ workItemType );
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: workItemType,
            limit: 1000, // not handling fringe case where a work item could have more than 1000 revs in last 24
            filters : [
                {
                    property: 'LastUpdateDate', 
                    operator: '>', 
                    value: this._dateString
                }],
            fetch: ['RevisionHistory', 'ObjectID', 'Revisions', 'FormattedID', 'Name', 'RevisionNumber', 'CreationDate', 'User', 'Description', 'LastUpdateDate'],
            listeners: {
                load: function(store, data, success) {
                    callback(null, data); // invokes _prepareLineByLineGrid
                },
                scope: this
            }
        });
    },
    
    _prepareLineByLineGrid: function(data) {
        var lines = [];
        
        this._populateLineArray(data, lines);
        
        Ext.create('Rally.data.custom.Store', {
            autoLoad: true,
            data: lines,
            listeners: {
                load: function(store, data, success) {
                    this._showLineByLineGrid(store);
                },
                scope: this
            }
        });
    },
    
    _populateLineArray: function(data, lines) {
        Ext.Array.each(data, function(item) {
            var line = {
                    FormattedID: item.get('FormattedID'),
                    Name: item.get('Name'),
                    Description: "",
                    RevisionAuthor: ""
            };
            Ext.Array.each(item.get('RevisionHistory').Revisions, function(rev) {
                // only one a single entry for all the descriptions so it fits in a single grid cell
                if ( rev.CreationDate > this._dateString ) {
                    line.Description += rev.Description + "<BR>";
                    line.RevisionAuthor += rev.User._refObjectName + "<BR>";
                }
            },
            this ); // need to pass scope when in an array
            item.set("RevisionDescription",line.Description);
            item.set("RevisionAuthor",line.RevisionAuthor);
            lines.push(item);
        },
        this );
    },
    
    _showLineByLineGrid: function(store) {
        if (this.line_grid) {
            this.line_grid.destroy();
        }
        this.line_grid = Ext.create('Rally.ui.grid.Grid', {
            store: store,
            columnCfgs: [{
                text: 'ID',
                dataIndex: 'FormattedID',
                xtype: 'templatecolumn',
                // tpl:""
                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate') // make the ID a live link
            }, {
                text: 'Name',
                dataIndex: 'Name',
                flex: 1
            }, {
                text: 'author',
                dataIndex: 'RevisionAuthor'
            }, {
                text: 'description',
                dataIndex: 'RevisionDescription',
                flex: 2
            }]
        });
        this.down('#line_by_line_example').add(this.line_grid);
    }
});