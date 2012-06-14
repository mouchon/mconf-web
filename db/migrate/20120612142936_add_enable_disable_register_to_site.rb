class AddEnableDisableRegisterToSite < ActiveRecord::Migration
  def self.up
    add_column :sites ,:global_register,:boolean
  end

  def self.down
   remove_column :sites,:global_register
  end
end
