class AddEnableDisableRegisterToSite < ActiveRecord::Migration
  def self.up
    add_column :sites ,:enable_global_register,:boolean
  end

  def self.down
   remove_column :sites,:enable_global_register
  end
end
