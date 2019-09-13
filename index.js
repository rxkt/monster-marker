'use strict'
/*
  Reference List
  HuntingZoneIDs: Bluebox-1023 | Caiman-1023 | crabs-6553782 | mongos seems to be dependent on location, are the zone ids the same as orignal location?
  Template IDs: Bluebox-88888888 | Caiman-99999999,99999991,99999992 | crabs-1021 | unknown for mongos | Test-mob - 181_2023

  To discover more ids, hook S_SPAWN_NPC and check huntingzoneid and templateId. Or use 'mob-id-finder' module on my Github (SerenTera)

  Configs are in config.json. If you do not have it, it will be auto generated on your first login
*/

const path = require('path'),
      fs = require('fs'),
      config = require('./config.json')

module.exports = function markmob(mod) {
    
    let	mobid=[],
	fileopen = true,
	stopwrite,
	enabled = config.enabled,
	active = false,
	markenabled = config.markenabled,
	messager = config.messenger,
	alerts = config.alerts,
	sendToParty = config.sendToParty,
	sendToRaid = config.sendToRaid,
	markMob = config.markMob,
	poiMob = config.poiMob,
	Item_ID = config.Item_ID,
	Monster_ID = config.Monster_ID,
	specialMobSearch = config.specialMobSearch,
	offset = 69n,
	channel = 0

    mod.hook('S_CURRENT_CHANNEL', 2, (event) => {   		
	channel = event.channel
    })
    
    ///////Commands
    mod.command.add('warn', {
	$default() {
	    mod.command.message('Invalid Command. Type "warn info" for help')
	},
	
	info() {
	    mod.command.message(`Version: ${config.gameVersion}`)
	    mod.command.message(`Commands: warn [arguments]
Arguments are as follows:
toggle: Enable/Disable Module
alert: Toggle popup alerts
marker: Toggles markers spawn
clear: Clears marker
active: Checks if module is active zone
party: Sends party notice
raid: Sends raid notice
mark: Marks mob with pointer
poi: Adds POI to message
Ingame fileIO has been discontinued.`)
	},
	
	toggle() {
	    enabled=!enabled
	    mod.command.message( enabled ? ' Module Enabled' : ' Module Disabled')
	    
	    if(!enabled)
		for(let itemid of mobid) despawnthis(itemid)
	},
	
	alert() {
	    alerts = !alerts
	    mod.command.message(alerts ? 'System popup notice enabled' : 'System popup notice disabled')
	},

	party(){
	    sendToParty = !sendToParty;
	    if (sendToParty) sendToRaid=false; //avoid sending duplicates
	    mod.command.message( 'To party: ' + sendToParty );
	},

	raid(){
	    sendToRaid = !sendToRaid;
	    if (sendToRaid) sendToParty=false; //avoid sending duplicates
	    mod.command.message( 'To raid: ' + sendToRaid );
	},

	mark(){
	    markMob = !markMob;
	    mod.command.message( 'Mark mobs: ' + markMob );
	},

	poi(){
	    poiMob = !poiMob;
	    mod.command.message( 'Poi mobs: ' + poiMob );
	},
	
	marker() {
	    markenabled = !markenabled
	    mod.command.message(markenabled ? 'Item Markers enabled' : 'Item Markers disabled')
	},
	
	clear() {
	    mod.command.message('Item Markers Clear Attempted')
	    for(let itemid of mobid) despawnthis(itemid)
	},

	active() {
	    mod.command.message(`Active status: ${active}`)
	}

	
    })
    
    ////////Dispatches
    mod.hook('S_SPAWN_NPC', 11, event => {	//Use version >5. Hunting zone ids are indeed only int16 types.
	if(!active || !enabled) return 
	
	
	if(Monster_ID[`${event.huntingZoneId}_${event.templateId}`]) {
	    if(markenabled) {
		markthis(event.loc,event.gameId), //create unique id ?
		mobid.push(event.gameId)
	    }
	    
	    if(alerts) notice( Monster_ID[`${event.huntingZoneId}_${event.templateId}`], event)
	    
	    if(messager) mod.command.message( Monster_ID[`${event.huntingZoneId}_${event.templateId}`])

	    if(markMob) mod.send('C_PARTY_MARKER', 1, {markers:[{color:2, target:event.target}]}) //Mark Monster
	}
	
	else if(specialMobSearch && event.bySpawnEvent) { //New def
	    if(markenabled) {
		markthis(event.loc,event.gameId), 
		mobid.push(event.gameId)
	    }
	    
	    if(alerts) notice(`Found Special Monster`, event)
	    
	    if(messager) mod.command.message(`Found Special Monster`)
	    //console.log(`Special mob:${event.huntingZoneId}_${event.templateId}`)
	    
	    if(markMob) mod.send('C_PARTY_MARKER', 1, {markers:[{color:2, target:event.target}]}) //Mark Monster
	}
	
    }) 

    mod.hook('S_DESPAWN_NPC', 3, event => {
	if(mobid.includes(event.gameId)) {
	    despawnthis(event.gameId),
	    mobid.splice(mobid.indexOf(event.gameId), 1)
	}
    })
    
    mod.hook('S_LOAD_TOPO', 3, event => { //reset mobid list on location change
	mobid=[]
	active = event.zone < 9000  //Check if it is a dungeon instance, since event mobs can come from dungeon
    })
    
    
    ////////Functions
    function markthis(locs,idRef) {
	mod.send('S_SPAWN_DROPITEM', 7, {
	    gameId: idRef * offset,
	    loc:locs,
	    item: Item_ID, 
	    amount: 1,
	    expiry: 300000, //expiry time,milseconds (300000=5 mins?)
	    explode:false,
	    masterwork:false,
	    enchant:0,
	    source:0,
	    debug:false,
	    owners: [{id: 0}]
	});
    }
    
    function despawnthis(despawnid) {
	mod.send('S_DESPAWN_DROPITEM', 4, {
	    gameId: despawnid * offset
	});
    }
    
    function notice(msg, event) {

	//currently only supports caimans
	let poi = ""
	if ( poiMob && (Monster_ID[`${event.huntingZoneId}_${event.templateId}`] === "caiman")) poi = `<FONT color="#E114"><ChatLinkAction param="3#####1_11_113@7014@${event.loc.x},${event.loc.y},${event.loc.z}">&lt;Point of interest.&gt;</ChatLinkAction></FONT>`
	
	if (sendToParty){
	    mod.send('C_CHAT', 1, {
		channel: 21,
		message: msg + ( poiMob ? ` Ch.${channel} ${poi}` : "")
	    });
	}else if (sendToRaid){
	    mod.send('C_CHAT', 1, {
		channel: 25, 
		message: msg + ( poiMob ? ` Ch.${channel} ${poi}` : "")
	    });
	}else{
	    mod.send('S_CHAT', 2, {
		channel: 21,
		authorName: 'Monster-Marker',
		message: msg + ( poiMob ? ` Ch.${channel} ${poi}` : "")
	    });
	}
	
    }
}
