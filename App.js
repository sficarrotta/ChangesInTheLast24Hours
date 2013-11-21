
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
        //console.log("date string: ", dateString);
        this._getSomeWorkItems("User Story");
    },
    
    _getSomeWorkItems: function(workItemType) {
        var lines = [];
        if (this.line_grid) {
            this.line_grid.destroy();
        }
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: workItemType,
            filters : [
                {
                    property: 'LastUpdateDate', 
                    operator: '>', 
                    value: this._dateString
                }],
            fetch: ['RevisionHistory', 'Revisions', 'FormattedID', 'Name', 'RevisionNumber', 'CreationDate', 'User', 'Description', 'LastUpdateDate'],
            listeners: {
                load: function(store, data, success) {
                    this._prepareLineByLineGrid(data, lines);
                },
                scope: this
            }
        });
    },
    
    _prepareLineByLineGrid: function(data, lines) {
        
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
                //debugger;
                //console.log("create date: ", rev.CreationDate, "dateString: ", dateString);
                if ( rev.CreationDate > this._dateString ) {
                    line.Description += rev.Description + "<BR>";
                    line.RevisionAuthor += rev.User._refObjectName + "<BR>";
                }
            },
            this ); // need to pass scope
//debugger;
            lines.push(line);
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
                dataIndex: 'Description',
                flex: 2
            }]
        });
        this.down('#line_by_line_example').add(this.line_grid);
    }
});